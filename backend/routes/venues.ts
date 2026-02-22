/**
 * Venue routes
 * GET    /api/venues              – list approved venues (public)
 * GET    /api/venues/:id          – single approved venue (public)
 * GET    /api/venues/:id/capacity – real-time capacity snapshot (public)
 * POST   /api/venues              – create venue (business, authenticated)
 * PATCH  /api/venues/:id          – update venue details/crowd (owner only)
 * POST   /api/venues/:id/checkin  – increment current_count (owner / admin only)
 * POST   /api/venues/:id/checkout – decrement current_count (owner / admin only)
 * DELETE /api/venues/:id          – delete venue (owner or admin)
 */
import { Hono } from "hono";
import { requireAuth, requireRole } from "../auth";
import { query, type DbVenue, type DbCapacityLog } from "../db";

const venues = new Hono();

// ---------- helpers ----------

function rowToVenue(v: DbVenue) {
  const level = crowdLevelFn(v.current_count, v.capacity);
  return {
    id: v.id,
    ownerUserId: v.owner_user_id,
    name: v.name,
    address: v.address,
    geo: { lat: v.lat ?? 0, lng: v.lng ?? 0 },
    timezone: v.timezone,
    hours: typeof v.hours === "string" ? JSON.parse(v.hours) : v.hours,
    minAge: v.min_age,
    minEntryAge: v.min_age >= 21 ? "21+" : "18+",
    dressCode: v.dress_code ?? "Casual",
    capacity: v.capacity,
    maxCapacity: v.capacity,
    currentCount: v.current_count,
    crowdCount: v.current_count,
    crowdLevel: level,
    crowdColor: crowdColor(level),
    capacityStatus: crowdLevelFn(v.current_count, v.capacity),
    genres: typeof v.genres === "string" ? JSON.parse(v.genres) : v.genres,
    photos: typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos,
    priceLevel: v.price_level,
    rating: v.rating,
    status: v.status,
    createdAt: v.created_at,
    featuredRank: 0,
  };
}

function crowdLevelFn(count: number, capacity: number): "quiet" | "moderate" | "busy" | "packed" {
  if (!capacity) return "quiet";
  const pct = count / capacity;
  if (pct >= 0.9) return "packed";
  if (pct >= 0.6) return "busy";
  if (pct >= 0.3) return "moderate";
  return "quiet";
}

/** Maps crowd level to a traffic-light colour for the frontend */
function crowdColor(level: "quiet" | "moderate" | "busy" | "packed"): "green" | "yellow" | "red" {
  if (level === "packed") return "red";
  if (level === "busy") return "yellow";
  return "green";
}

// ---------- public routes ----------

// GET /api/venues – approved venues only
venues.get("/", async (c) => {
  const res = await query<DbVenue>(
    `SELECT * FROM venues WHERE status = 'approved' ORDER BY created_at DESC`,
  );
  return c.json({ venues: res.rows.map(rowToVenue), total: res.rows.length });
});

// GET /api/venues/:id – single approved venue
venues.get("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await query<DbVenue>(
    `SELECT * FROM venues WHERE id = $1 AND status = 'approved'`,
    [id],
  );
  if (!res.rows[0]) return c.json({ error: "Venue not found" }, 404);
  return c.json(rowToVenue(res.rows[0]));
});

// POST /api/venues/:id/view – record a customer view (public, auth optional)
venues.post("/:id/view", async (c) => {
  const venueId = c.req.param("id");
  // Optionally extract userId from Bearer token without blocking unauthenticated users
  let userId: string | null = null;
  try {
    const auth = c.req.header("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const { verifyAccessToken } = await import("../auth");
      const payload = await verifyAccessToken(auth.slice(7));
      userId = (payload as any)?.sub ?? null;
    }
  } catch { /* anonymous view – fine */ }

  const id = crypto.randomUUID?.() ?? `view_${Date.now()}`;
  await query(
    "INSERT INTO venue_views (id, venue_id, viewer_user_id) VALUES ($1, $2, $3)",
    [id, venueId, userId],
  );
  return c.json({ recorded: true });
});

// POST /api/venues – business creates a venue (pending approval)
venues.post("/", requireAuth, requireRole("business"), async (c) => {
  let body: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    timezone?: string;
    hours?: Record<string, { open: string; close: string }>;
    minAge?: number;
    dressCode?: string;
    capacity?: number;
    genres?: string[];
    photos?: string[];
    priceLevel?: number;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { name, address, lat, lng, timezone, hours, minAge, dressCode, capacity, genres, photos, priceLevel } = body;
  if (!name) return c.json({ error: "name is required" }, 400);

  const userId = (c as any).get("userId");
  const id = crypto.randomUUID?.() ?? `venue_${Date.now()}`;

  const res = await query<DbVenue>(
    `INSERT INTO venues
      (id, owner_user_id, name, address, lat, lng, timezone, hours, min_age, dress_code,
       capacity, genres, photos, price_level, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',now(),now())
     RETURNING *`,
    [
      id, userId, name.trim(),
      address ?? "", lat ?? null, lng ?? null,
      timezone ?? "America/New_York",
      JSON.stringify(hours ?? {}),
      minAge ?? 18, dressCode ?? null,
      capacity ?? 100,
      JSON.stringify(genres ?? []),
      JSON.stringify(photos ?? []),
      priceLevel ?? 2,
    ],
  );

  return c.json(rowToVenue(res.rows[0]), 201);
});

// PATCH /api/venues/:id – update venue details (owner or admin)
venues.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const venueRes = await query<DbVenue>("SELECT * FROM venues WHERE id = $1", [id]);
  const venue = venueRes.rows[0];
  if (!venue) return c.json({ error: "Venue not found" }, 404);
  if (venue.owner_user_id !== userId && userRole !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  let body: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    timezone?: string;
    hours?: Record<string, { open: string; close: string }>;
    minAge?: number;
    dressCode?: string;
    capacity?: number;
    currentCount?: number;
    genres?: string[];
    photos?: string[];
    priceLevel?: number;
    rating?: number;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  const addField = (col: string, val: any) => {
    fields.push(`${col} = $${i++}`);
    values.push(val);
  };

  if (body.name !== undefined) addField("name", body.name.trim());
  if (body.address !== undefined) addField("address", body.address);
  if (body.lat !== undefined) addField("lat", body.lat);
  if (body.lng !== undefined) addField("lng", body.lng);
  if (body.timezone !== undefined) addField("timezone", body.timezone);
  if (body.hours !== undefined) addField("hours", JSON.stringify(body.hours));
  if (body.minAge !== undefined) addField("min_age", body.minAge);
  if (body.dressCode !== undefined) addField("dress_code", body.dressCode);
  if (body.capacity !== undefined) addField("capacity", body.capacity);
  if (body.currentCount !== undefined) addField("current_count", body.currentCount);
  if (body.genres !== undefined) addField("genres", JSON.stringify(body.genres));
  if (body.photos !== undefined) addField("photos", JSON.stringify(body.photos));
  if (body.priceLevel !== undefined) addField("price_level", body.priceLevel);
  if (body.rating !== undefined) addField("rating", body.rating);

  if (!fields.length) return c.json({ error: "No fields to update" }, 400);
  fields.push(`updated_at = now()`);
  values.push(id);

  const updated = await query<DbVenue>(
    `UPDATE venues SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );

  return c.json(rowToVenue(updated.rows[0]));
});

// DELETE /api/venues/:id
venues.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const venueRes = await query<DbVenue>("SELECT owner_user_id FROM venues WHERE id = $1", [id]);
  const venue = venueRes.rows[0];
  if (!venue) return c.json({ error: "Venue not found" }, 404);
  if (venue.owner_user_id !== userId && userRole !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await query("DELETE FROM venues WHERE id = $1", [id]);
  return c.json({ message: "Venue deleted" });
});

// ---------- capacity endpoints ----------

// GET /api/venues/:id/capacity – real-time capacity snapshot (public)
// No status filter – capacity data is harmless to expose for pending venues too
venues.get("/:id/capacity", async (c) => {
  const id = c.req.param("id");
  const res = await query<DbVenue>(
    "SELECT id, name, current_count, capacity FROM venues WHERE id = $1",
    [id],
  );
  const v = res.rows[0];
  if (!v) return c.json({ error: "Venue not found" }, 404);

  const level = crowdLevelFn(v.current_count, v.capacity);
  return c.json({
    venueId: v.id,
    venueName: v.name,
    currentCount: v.current_count,
    maxCapacity: v.capacity,
    occupancyPct: v.capacity > 0 ? Math.round((v.current_count / v.capacity) * 100) : 0,
    crowdLevel: level,
    crowdColor: crowdColor(level),
    updatedAt: new Date().toISOString(),
  });
});

// POST /api/venues/:id/checkin – increment current_count (owner / admin only)
venues.post("/:id/checkin", requireAuth, requireRole("business", "admin"), async (c) => {
  const id = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const venueRes = await query<DbVenue>(
    "SELECT id, name, owner_user_id, current_count, capacity FROM venues WHERE id = $1",
    [id],
  );
  const v = venueRes.rows[0];
  if (!v) return c.json({ error: "Venue not found" }, 404);
  if (v.owner_user_id !== userId && userRole !== "admin") {
    return c.json({ error: "Forbidden – you do not own this venue" }, 403);
  }
  if (v.current_count >= v.capacity) {
    return c.json({ error: "Venue is at maximum capacity" }, 409);
  }

  const updated = await query<DbVenue>(
    "UPDATE venues SET current_count = current_count + 1, updated_at = now() WHERE id = $1 RETURNING id, name, current_count, capacity",
    [id],
  );
  const u = updated.rows[0];
  const logId = crypto.randomUUID?.() ?? `log_${Date.now()}`;
  await query(
    "INSERT INTO capacity_log (id, venue_id, actor_user_id, direction, count_after) VALUES ($1,$2,$3,'in',$4)",
    [logId, id, userId, u.current_count],
  );

  const level = crowdLevelFn(u.current_count, u.capacity);
  return c.json({
    venueId: u.id,
    venueName: u.name,
    currentCount: u.current_count,
    maxCapacity: u.capacity,
    occupancyPct: u.capacity > 0 ? Math.round((u.current_count / u.capacity) * 100) : 0,
    crowdLevel: level,
    crowdColor: crowdColor(level),
    updatedAt: new Date().toISOString(),
  });
});

// POST /api/venues/:id/checkout – decrement current_count (owner / admin only)
venues.post("/:id/checkout", requireAuth, requireRole("business", "admin"), async (c) => {
  const id = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const venueRes = await query<DbVenue>(
    "SELECT id, name, owner_user_id, current_count, capacity FROM venues WHERE id = $1",
    [id],
  );
  const v = venueRes.rows[0];
  if (!v) return c.json({ error: "Venue not found" }, 404);
  if (v.owner_user_id !== userId && userRole !== "admin") {
    return c.json({ error: "Forbidden – you do not own this venue" }, 403);
  }
  if (v.current_count <= 0) {
    return c.json({ error: "Count is already 0" }, 409);
  }

  const updated = await query<DbVenue>(
    "UPDATE venues SET current_count = GREATEST(current_count - 1, 0), updated_at = now() WHERE id = $1 RETURNING id, name, current_count, capacity",
    [id],
  );
  const u = updated.rows[0];
  const logId = crypto.randomUUID?.() ?? `log_${Date.now()}`;
  await query(
    "INSERT INTO capacity_log (id, venue_id, actor_user_id, direction, count_after) VALUES ($1,$2,$3,'out',$4)",
    [logId, id, userId, u.current_count],
  );

  const level = crowdLevelFn(u.current_count, u.capacity);
  return c.json({
    venueId: u.id,
    venueName: u.name,
    currentCount: u.current_count,
    maxCapacity: u.capacity,
    occupancyPct: u.capacity > 0 ? Math.round((u.current_count / u.capacity) * 100) : 0,
    crowdLevel: level,
    crowdColor: crowdColor(level),
    updatedAt: new Date().toISOString(),
  });
});

export default venues;
