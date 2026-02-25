/**
 * Business auth routes (Postgres-backed)
 * POST /api/business/register
 * POST /api/business/login
 * POST /api/business/refresh
 * GET  /api/business/me
 * POST /api/business/change-password
 *
 * Business management routes (require business/admin role)
 * GET    /api/business/venues               – list venues owned by this business
 * GET    /api/business/venues/:id/capacity  – real-time capacity for owned venue
 * GET    /api/business/orders               – list orders for owned venues
 * PATCH  /api/business/orders/:id/status    – update order business_status
 * GET    /api/business/dashboard            – dashboard stats for owned venue
 * GET    /api/business/offers               – list offers for owned venues
 * POST   /api/business/offers               – create an offer
 * PATCH  /api/business/offers/:id/status    – toggle offer status
 * DELETE /api/business/offers/:id           – delete an offer
 * GET    /api/business/events               – list events for owned venues
 * POST   /api/business/events               – create an event
 * PATCH  /api/business/events/:id/status    – update event status
 * DELETE /api/business/events/:id           – delete an event
 */
import { Hono } from "hono";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  requireAuth,
  requireRole,
} from "../auth";
import { query, type DbUser, type DbOrder, type DbVenue, type DbOffer, type DbEvent } from "../db";
import { sendBusinessApprovalRequestEmail, type BusinessApprovalData } from "../email";

const business = new Hono();

// Register business
business.post("/register", async (c) => {
  let body: { name?: string; email?: string; password?: string; businessName?: string; businessCategory?: string; phone?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { name, email, password, businessName, businessCategory, phone } = body;
  if (!name || !email || !password || !businessName) {
    return c.json({ error: "name, email, password and businessName are required" }, 400);
  }
  if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);

  const normalised = email.trim().toLowerCase();
  const exists = await query<DbUser>("SELECT id FROM users WHERE email = $1", [normalised]);
  if (exists.rowCount && exists.rows.length > 0) {
    return c.json({ error: "Email already exists" }, 409);
  }

  const id = crypto.randomUUID?.() ?? `biz_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const passwordHash = await hashPassword(password);

  const insert = await query<DbUser>(
    `INSERT INTO users (id, email, name, password_hash, role, phone, business_name, business_category, business_status, created_at)
     VALUES ($1, $2, $3, $4, 'business', $5, $6, $7, 'pending', now())
     RETURNING id, email, name, business_name, business_category, business_status, role, created_at`,
    [id, normalised, name.trim(), passwordHash, phone ?? null, businessName, businessCategory ?? null],
  );
  const user = insert.rows[0];

  const accessToken = await signAccessToken(user.id, user.email, "business");
  const refreshToken = await signRefreshToken(user.id, "business");
  await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [refreshToken, user.id]);

  // Generate a one-click approval token and notify Tipzy admin
  try {
    const approvalToken = crypto.randomUUID?.() ?? `bat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await query(
      "INSERT INTO business_approval_tokens (token, user_id) VALUES ($1, $2)",
      [approvalToken, id],
    );
    const apiBase = process.env.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
    const approvalUrl = `${apiBase}/api/admin/approve-business/${approvalToken}`;
    const approvalData: BusinessApprovalData = {
      userId: id,
      ownerName: name.trim(),
      ownerEmail: normalised,
      businessName,
      businessCategory: businessCategory ?? null,
      phone: phone ?? null,
      address: null,
      capacity: null,
      minAge: null,
      genres: null,
      createdAt: user.created_at,
    };
    await sendBusinessApprovalRequestEmail(approvalData, approvalUrl);
  } catch (emailErr) {
    console.error("[business/register] Failed to send approval email:", emailErr);
  }

  return c.json({
    message: "Business registered successfully. Account pending approval.",
    user: { id, email: user.email, name: user.name, businessName, businessCategory, businessStatus: "pending", role: "business", createdAt: user.created_at },
    token: accessToken,
    refreshToken,
  }, 201);
});

// Upgrade an existing authenticated user account to a business account
// Also creates the venue record atomically so business + venue are always in sync.
business.patch("/upgrade-account", requireAuth, async (c) => {
  const userId = (c as any).get('userId') as string;
  let body: {
    businessName?: string;
    businessCategory?: string;
    phone?: string;
    // venue fields
    address?: string;
    lat?: number;
    lng?: number;
    capacity?: number;
    minAge?: number;
    hours?: Record<string, { open: string; close: string }>;
    genres?: string[];
    photos?: string[];
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { businessName, businessCategory, phone, address, lat, lng, capacity, minAge, hours, genres, photos } = body;
  if (!businessName) return c.json({ error: "businessName is required" }, 400);

  const userRes = await query<DbUser>("SELECT * FROM users WHERE id = $1", [userId]);
  const user = userRes.rows[0];
  if (!user) return c.json({ error: "User not found" }, 401);
  if (user.role === "business") return c.json({ error: "Account is already a business account" }, 409);

  const updated = await query<DbUser>(
    `UPDATE users
     SET role = 'business',
         business_name     = $1,
         business_category = $2,
         business_status   = 'pending',
         phone             = COALESCE($3, phone)
     WHERE id = $4
     RETURNING id, email, name, business_name, business_category, business_status, role, created_at, phone`,
    [businessName, businessCategory ?? null, phone ?? null, userId],
  );
  const updatedUser = updated.rows[0];

  // Create the venue record atomically so business and venue are always linked
  const venueId = crypto.randomUUID?.() ?? `venue_${Date.now()}`;
  await query<DbVenue>(
    `INSERT INTO venues
      (id, owner_user_id, name, address, lat, lng, timezone, hours, min_age, dress_code,
       capacity, genres, photos, price_level, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',now(),now())`,
    [
      venueId, userId, businessName.trim(),
      address ?? "", lat ?? null, lng ?? null,
      "America/New_York",
      JSON.stringify(hours ?? {}),
      minAge ?? 18, null,
      capacity ?? 100,
      JSON.stringify(genres ?? []),
      JSON.stringify(photos ?? []),
      2,
    ],
  );

  // Invalidate all previous tokens and issue fresh ones with business role
  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  const accessToken = await signAccessToken(updatedUser.id, updatedUser.email, "business");
  const refreshToken = await signRefreshToken(updatedUser.id, "business");
  await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [refreshToken, userId]);

  // Generate a one-click approval token and notify Tipzy admin
  try {
    const approvalToken = crypto.randomUUID?.() ?? `bat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await query("DELETE FROM business_approval_tokens WHERE user_id = $1", [userId]);
    await query(
      "INSERT INTO business_approval_tokens (token, user_id) VALUES ($1, $2)",
      [approvalToken, userId],
    );
    const apiBase = process.env.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
    const approvalUrl = `${apiBase}/api/admin/approve-business/${approvalToken}`;
    const approvalData: BusinessApprovalData = {
      userId,
      ownerName: updatedUser.name,
      ownerEmail: updatedUser.email,
      businessName: businessName,
      businessCategory: businessCategory ?? null,
      phone: phone ?? updatedUser.phone ?? null,
      address: address ?? null,
      capacity: capacity ?? null,
      minAge: minAge ?? null,
      genres: genres ?? null,
      createdAt: updatedUser.created_at,
    };
    await sendBusinessApprovalRequestEmail(approvalData, approvalUrl);
  } catch (emailErr) {
    console.error("[business/upgrade-account] Failed to send approval email:", emailErr);
  }

  return c.json({
    message: "Account upgraded to business. Pending admin approval.",
    venueId,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      businessName: updatedUser.business_name,
      businessCategory: updatedUser.business_category,
      businessStatus: "pending",
      role: "business",
      createdAt: updatedUser.created_at,
    },
    token: accessToken,
    refreshToken,
  });
});

// Login business
business.post("/login", async (c) => {
  let body: { email?: string; password?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { email, password } = body;
  if (!email || !password) return c.json({ error: "email and password are required" }, 400);

  const userRes = await query<DbUser>("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
  const user = userRes.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 403);

  const accessToken = await signAccessToken(user.id, user.email, "business");
  const refreshToken = await signRefreshToken(user.id, "business");
  await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [refreshToken, user.id]);

  return c.json({
    message: "Login successful",
    user: {
      id: user.id, email: user.email, name: user.name,
      businessName: user.business_name, businessStatus: user.business_status,
      role: "business", createdAt: user.created_at,
    },
    token: accessToken,
    refreshToken,
  });
});

// Refresh token
business.post("/refresh", async (c) => {
  let body: { refreshToken?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { refreshToken } = body;
  if (!refreshToken) return c.json({ error: "refreshToken is required" }, 400);

  try {
    const payload = await verifyRefreshToken(refreshToken);
    const tokenRow = await query<{ user_id: string }>("SELECT user_id FROM refresh_tokens WHERE token = $1", [refreshToken]);
    if (!tokenRow.rowCount || tokenRow.rows[0].user_id !== payload.userId) {
      return c.json({ error: "Invalid refresh token" }, 401);
    }

    const userRes = await query<DbUser>("SELECT * FROM users WHERE id = $1", [payload.userId]);
    const user = userRes.rows[0];
    if (!user) return c.json({ error: "User not found" }, 401);

    await query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
    const newAccess = await signAccessToken(user.id, user.email, user.role);
    const newRefresh = await signRefreshToken(user.id, user.role);
    await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [newRefresh, user.id]);

    return c.json({ token: newAccess, refreshToken: newRefresh });
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }
});

// Me
business.get("/me", requireAuth, async (c) => {
  const userId = (c as any).get("userId");
  const res = await query<DbUser>("SELECT * FROM users WHERE id = $1", [userId]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    businessName: user.business_name, businessCategory: user.business_category,
    businessStatus: user.business_status, role: user.role, createdAt: user.created_at,
  });
});

// Change password
business.post("/change-password", requireAuth, async (c) => {
  let body: { currentPassword?: string; newPassword?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return c.json({ error: "currentPassword and newPassword are required" }, 400);
  if (newPassword.length < 6) return c.json({ error: "New password must be at least 6 characters" }, 400);

  const userId = (c as any).get("userId");
  const res = await query<DbUser>("SELECT * FROM users WHERE id = $1", [userId]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    return c.json({ error: "Current password is incorrect" }, 401);
  }

  const newHash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, userId]);
  return c.json({ message: "Password updated successfully" });
});

// ── Business management routes ───────────────────────────────────────────────

/** Helper – assert the caller owns (or is admin of) the given venue */
async function assertVenueOwner(userId: string, role: string, venueId: string) {
  const res = await query<{ owner_user_id: string }>(
    "SELECT owner_user_id FROM venues WHERE id = $1",
    [venueId],
  );
  const v = res.rows[0];
  if (!v) return "not_found";
  if (v.owner_user_id !== userId && role !== "admin") return "forbidden";
  return "ok";
}

// GET /api/business/venues – list all venues owned by authenticated business
business.get("/venues", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const whereClause = userRole === "admin" ? "" : "WHERE owner_user_id = $1";
  const params = userRole === "admin" ? [] : [userId];

  const res = await query<{
    id: string; name: string; status: string;
    current_count: number; capacity: number; address: string;
    lat: number | null; lng: number | null; updated_at: string;
  }>(
    `SELECT id, name, status, current_count, capacity, address, lat, lng, updated_at
     FROM venues ${whereClause} ORDER BY created_at DESC`,
    params,
  );

  const venues = res.rows.map(v => {
    const pct = v.capacity > 0 ? Math.round((v.current_count / v.capacity) * 100) : 0;
    const level = pct >= 90 ? "packed" : pct >= 60 ? "busy" : pct >= 30 ? "moderate" : "quiet";
    const color = level === "packed" ? "red" : level === "busy" ? "yellow" : "green";
    return {
      id: v.id, name: v.name, address: v.address, status: v.status,
      lat: v.lat ?? null, lng: v.lng ?? null,
      currentCount: v.current_count, maxCapacity: v.capacity,
      occupancyPct: pct, crowdLevel: level, crowdColor: color,
      updatedAt: v.updated_at,
    };
  });

  return c.json({ venues, total: venues.length });
});

// GET /api/business/venues/:id/capacity – live capacity for one owned venue
business.get("/venues/:id/capacity", requireAuth, requireRole("business", "admin"), async (c) => {
  const venueId = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const check = await assertVenueOwner(userId, userRole, venueId);
  if (check === "not_found") return c.json({ error: "Venue not found" }, 404);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  const res = await query<{ id: string; name: string; current_count: number; capacity: number }>(
    "SELECT id, name, current_count, capacity FROM venues WHERE id = $1",
    [venueId],
  );
  const v = res.rows[0];
  const pct = v.capacity > 0 ? Math.round((v.current_count / v.capacity) * 100) : 0;
  const level = pct >= 90 ? "packed" : pct >= 60 ? "busy" : pct >= 30 ? "moderate" : "quiet";
  const color = level === "packed" ? "red" : level === "busy" ? "yellow" : "green";

  return c.json({
    venueId: v.id, venueName: v.name,
    currentCount: v.current_count, maxCapacity: v.capacity,
    occupancyPct: pct, crowdLevel: level, crowdColor: color,
    updatedAt: new Date().toISOString(),
  });
});

// GET /api/business/orders – orders for venues owned by this business
business.get("/orders", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");
  const { status, venueId } = c.req.query() as { status?: string; venueId?: string };

  let sql = `
    SELECT o.*, u.name AS customer_name, u.email AS customer_email,
           v.name AS venue_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN venues v ON v.id = o.venue_id
    WHERE 1=1
  `;
  const params: any[] = [];
  let i = 1;

  if (userRole !== "admin") {
    sql += ` AND v.owner_user_id = $${i++}`;
    params.push(userId);
  }
  if (status) {
    sql += ` AND o.business_status = $${i++}`;
    params.push(status);
  }
  if (venueId) {
    sql += ` AND o.venue_id = $${i++}`;
    params.push(venueId);
  }
  sql += " ORDER BY o.created_at DESC LIMIT 200";

  const res = await query<DbOrder & { customer_name: string; customer_email: string; venue_name: string }>(
    sql, params,
  );

  const orders = res.rows.map(o => ({
    id: o.id,
    orderId: o.id,
    userId: o.user_id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    venueId: o.venue_id,
    venueName: o.venue_name,
    eventId: o.event_id,
    product: o.product_name,
    quantity: o.quantity,
    amountTotal: Number(o.amount_total),
    currency: o.currency,
    businessStatus: o.business_status,
    notes: o.notes,
    orderDate: o.created_at,
  }));

  return c.json({ orders, total: orders.length });
});

// PATCH /api/business/orders/:id/status – change business_status of an order
business.patch("/orders/:id/status", requireAuth, requireRole("business", "admin"), async (c) => {
  const orderId = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  let body: { status?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const VALID = ["pending", "accepted", "rejected", "completed", "refunded"] as const;
  const newStatus = body.status as typeof VALID[number];
  if (!VALID.includes(newStatus)) {
    return c.json({ error: `status must be one of: ${VALID.join(", ")}` }, 400);
  }

  // Verify the caller owns the venue the order belongs to
  const orderRes = await query<{ venue_id: string; business_status: string }>(
    "SELECT venue_id, business_status FROM orders WHERE id = $1",
    [orderId],
  );
  const order = orderRes.rows[0];
  if (!order) return c.json({ error: "Order not found" }, 404);

  const check = await assertVenueOwner(userId, userRole, order.venue_id);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  const updated = await query<DbOrder>(
    "UPDATE orders SET business_status = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [newStatus, orderId],
  );
  return c.json({ order: updated.rows[0], message: `Order ${newStatus}` });
});

// GET /api/business/dashboard – summary stats for owned venues
business.get("/dashboard", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  // Get first owned venue (or all for admin)
  const venueFilter = userRole === "admin"
    ? ""
    : "WHERE owner_user_id = $1";
  const venueParams = userRole === "admin" ? [] : [userId];

  const venueRes = await query<{ id: string; current_count: number; capacity: number }>(
    `SELECT id, current_count, capacity FROM venues ${venueFilter} LIMIT 1`,
    venueParams,
  );
  const venue = venueRes.rows[0];
  if (!venue) {
    return c.json({
      venueId: null, totalOrdersToday: 0, revenueToday: 0,
      pendingOrders: 0, acceptedOrders: 0, weeklyRevenue: 0,
      weeklySales: 0, weeklyViews: 0,
    });
  }

  const [todayRes, weekRes, pendingRes, acceptedRes, viewsRes] = await Promise.all([
    query<{ count: string; revenue: string }>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_total),0)::text AS revenue
       FROM orders WHERE venue_id = $1 AND created_at >= CURRENT_DATE`,
      [venue.id],
    ),
    query<{ count: string; revenue: string }>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_total),0)::text AS revenue
       FROM orders WHERE venue_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [venue.id],
    ),
    query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM orders WHERE venue_id = $1 AND business_status = 'pending'",
      [venue.id],
    ),
    query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM orders WHERE venue_id = $1 AND business_status = 'accepted'",
      [venue.id],
    ),
    // Daily view counts for the last 7 days
    query<{ day: string; count: string }>(
      `SELECT TO_CHAR(viewed_at AT TIME ZONE 'UTC', 'Dy') AS day,
              COUNT(*)::text AS count
       FROM venue_views
       WHERE venue_id = $1
         AND viewed_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY TO_CHAR(viewed_at AT TIME ZONE 'UTC', 'Dy'),
                DATE_TRUNC('day', viewed_at AT TIME ZONE 'UTC')
       ORDER BY DATE_TRUNC('day', viewed_at AT TIME ZONE 'UTC')`,
      [venue.id],
    ),
  ]);

  // Build a full 7-day chart even if some days have 0 views
  const DAYS_ORDER = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  const viewsByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    viewsByDay[label] = 0;
  }
  for (const row of viewsRes.rows) {
    viewsByDay[row.day] = Number(row.count);
  }
  const weeklyViewsChart = Object.entries(viewsByDay).map(([label, value]) => ({ label, value }));

  return c.json({
    venueId: venue.id,
    currentCount: venue.current_count,
    maxCapacity: venue.capacity,
    totalOrdersToday: Number(todayRes.rows[0]?.count ?? 0),
    revenueToday: Number(todayRes.rows[0]?.revenue ?? 0),
    pendingOrders: Number(pendingRes.rows[0]?.count ?? 0),
    acceptedOrders: Number(acceptedRes.rows[0]?.count ?? 0),
    weeklyRevenue: Number(weekRes.rows[0]?.revenue ?? 0),
    weeklySales: Number(weekRes.rows[0]?.count ?? 0),
    weeklyViews: weeklyViewsChart.reduce((s, d) => s + d.value, 0),
    weeklyViewsChart,
  });
});

// ── Offers ───────────────────────────────────────────────────────────────────

// GET /api/business/offers – list offers for this business's venues
business.get("/offers", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  let sql = `
    SELECT o.*, v.name AS venue_name
    FROM offers o
    JOIN venues v ON v.id = o.venue_id
  `;
  const params: any[] = [];
  if (userRole !== "admin") {
    sql += " WHERE o.owner_user_id = $1";
    params.push(userId);
  }
  sql += " ORDER BY o.created_at DESC";

  const res = await query<DbOffer & { venue_name: string }>(sql, params);
  return c.json({ offers: res.rows });
});

// POST /api/business/offers – create a new offer
business.post("/offers", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  let body: { name?: string; discount?: number; description?: string; endDate?: string; venueId?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { name, discount, description, endDate, venueId } = body;
  if (!name || discount === undefined || !venueId) {
    return c.json({ error: "name, discount, and venueId are required" }, 400);
  }

  const check = await assertVenueOwner(userId, (c as any).get("role"), venueId);
  if (check === "not_found") return c.json({ error: "Venue not found" }, 404);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  const id = crypto.randomUUID?.() ?? `offer_${Date.now()}`;
  const res = await query<DbOffer>(
    `INSERT INTO offers (id, venue_id, owner_user_id, name, discount, description, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, venueId, userId, name.trim(), Number(discount), description ?? null, endDate ?? null],
  );
  return c.json({ offer: res.rows[0], message: "Offer created" }, 201);
});

// PATCH /api/business/offers/:id/status – toggle active/suspended
business.patch("/offers/:id/status", requireAuth, requireRole("business", "admin"), async (c) => {
  const offerId = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  let body: { status?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { status } = body;
  if (status !== "active" && status !== "suspended") {
    return c.json({ error: "status must be 'active' or 'suspended'" }, 400);
  }

  const offerRes = await query<{ venue_id: string }>("SELECT venue_id FROM offers WHERE id = $1", [offerId]);
  if (!offerRes.rowCount) return c.json({ error: "Offer not found" }, 404);

  const check = await assertVenueOwner(userId, userRole, offerRes.rows[0].venue_id);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  const updated = await query<DbOffer>(
    "UPDATE offers SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [status, offerId],
  );
  return c.json({ offer: updated.rows[0] });
});

// DELETE /api/business/offers/:id
business.delete("/offers/:id", requireAuth, requireRole("business", "admin"), async (c) => {
  const offerId = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const offerRes = await query<{ venue_id: string }>("SELECT venue_id FROM offers WHERE id = $1", [offerId]);
  if (!offerRes.rowCount) return c.json({ error: "Offer not found" }, 404);

  const check = await assertVenueOwner(userId, userRole, offerRes.rows[0].venue_id);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  await query("DELETE FROM offers WHERE id = $1", [offerId]);
  return c.json({ message: "Offer deleted" });
});

// ── Events ───────────────────────────────────────────────────────────────────

// GET /api/business/events – list events for this business's venues
business.get("/events", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  let sql = `
    SELECT e.*, v.name AS venue_name
    FROM events e
    JOIN venues v ON v.id = e.venue_id
  `;
  const params: any[] = [];
  if (userRole !== "admin") {
    sql += " WHERE e.owner_user_id = $1";
    params.push(userId);
  }
  sql += " ORDER BY e.event_date DESC, e.created_at DESC";

  const res = await query<DbEvent & { venue_name: string }>(sql, params);
  return c.json({ events: res.rows });
});

// POST /api/business/events – create a new event
business.post("/events", requireAuth, requireRole("business", "admin"), async (c) => {
  const userId = (c as any).get("userId");
  let body: { name?: string; description?: string; date?: string; time?: string; image?: string; venueId?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { name, description, date, time, image, venueId } = body;
  if (!name || !date || !time || !venueId) {
    return c.json({ error: "name, date, time, and venueId are required" }, 400);
  }

  const check = await assertVenueOwner(userId, (c as any).get("role"), venueId);
  if (check === "not_found") return c.json({ error: "Venue not found" }, 404);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  const id = crypto.randomUUID?.() ?? `event_${Date.now()}`;
  const res = await query<DbEvent>(
    `INSERT INTO events (id, venue_id, owner_user_id, name, description, event_date, event_time, image)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, venueId, userId, name.trim(), description ?? null, date, time, image ?? null],
  );
  return c.json({ event: res.rows[0], message: "Event created" }, 201);
});

// PATCH /api/business/events/:id/status – update event status
business.patch("/events/:id/status", requireAuth, requireRole("business", "admin"), async (c) => {
  const eventId = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  let body: { status?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { status } = body;
  if (!(["draft", "published", "cancelled"] as const).includes(status as any)) {
    return c.json({ error: "status must be 'draft', 'published', or 'cancelled'" }, 400);
  }

  const eventRes = await query<{ venue_id: string }>("SELECT venue_id FROM events WHERE id = $1", [eventId]);
  if (!eventRes.rowCount) return c.json({ error: "Event not found" }, 404);

  const check = await assertVenueOwner(userId, userRole, eventRes.rows[0].venue_id);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  const updated = await query<DbEvent>(
    "UPDATE events SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [status, eventId],
  );
  return c.json({ event: updated.rows[0] });
});

// DELETE /api/business/events/:id
business.delete("/events/:id", requireAuth, requireRole("business", "admin"), async (c) => {
  const eventId = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const eventRes = await query<{ venue_id: string }>("SELECT venue_id FROM events WHERE id = $1", [eventId]);
  if (!eventRes.rowCount) return c.json({ error: "Event not found" }, 404);

  const check = await assertVenueOwner(userId, userRole, eventRes.rows[0].venue_id);
  if (check === "forbidden") return c.json({ error: "Forbidden" }, 403);

  await query("DELETE FROM events WHERE id = $1", [eventId]);
  return c.json({ message: "Event deleted" });
});

export default business;
