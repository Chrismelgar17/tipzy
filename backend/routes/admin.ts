/**
 * Admin routes (Postgres-backed)
 * GET  /api/admin/users          – list all users
 * PATCH /api/admin/users/:id/role – promote/demote a user's role
 * PATCH /api/admin/business/:id/approve – approve a business
 * PATCH /api/admin/business/:id/reject  – reject a business
 * DELETE /api/admin/users/:id    – delete any user
 *
 * All routes require a valid JWT with role=admin.
 */
import { Hono } from "hono";
import { requireAuth, requireRole, hashPassword, verifyPassword, signAccessToken, signRefreshToken } from "../auth";
import { query, type DbUser } from "../db";
import { sendBusinessApprovedEmail, sendBusinessRejectedEmail, sendOfferApprovedEmail, sendOfferRejectedEmail, sendSponsorApprovedEmail, sendSponsorRejectedEmail } from "../email";

const admin = new Hono();

// ── PUBLIC: one-click business approval via email link ───────────────────────
// This route is intentionally placed BEFORE the requireAuth middleware so the
// admin can approve a business simply by clicking the link in the email.
admin.get("/approve-business/:token", async (c) => {
  const token = c.req.param("token");

  const tokenRes = await query<{ user_id: string }>(
    "SELECT user_id FROM business_approval_tokens WHERE token = $1",
    [token],
  );
  const tokenRow = tokenRes.rows[0];

  if (!tokenRow) {
    return c.html(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Tipzy – Invalid Link</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F0F1A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}.card{background:#16213E;border-radius:16px;padding:48px 40px;text-align:center;max-width:460px;width:90%;border:1px solid rgba(255,255,255,0.08)}.icon{font-size:60px;margin-bottom:20px}h1{font-size:24px;font-weight:700;margin-bottom:12px}p{color:#9CA3AF;font-size:15px;line-height:1.6}</style>
</head><body><div class="card"><div class="icon">❌</div><h1>Invalid or Expired Link</h1><p>This approval link is not valid or has already been used.</p></div></body></html>`, 404);
  }

  const userId = tokenRow.user_id;

  const userRes = await query<DbUser>(
    "SELECT id, name, business_name FROM users WHERE id = $1",
    [userId],
  );
  const user = userRes.rows[0];

  if (!user) {
    return c.html(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Tipzy – Not Found</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F0F1A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}.card{background:#16213E;border-radius:16px;padding:48px 40px;text-align:center;max-width:460px;width:90%;border:1px solid rgba(255,255,255,0.08)}.icon{font-size:60px;margin-bottom:20px}h1{font-size:24px;font-weight:700;margin-bottom:12px}p{color:#9CA3AF;font-size:15px;line-height:1.6}</style>
</head><body><div class="card"><div class="icon">⚠️</div><h1>User Not Found</h1><p>The business account associated with this link could not be found.</p></div></body></html>`, 404);
  }

  // Approve the user account and their venue(s)
  await query("UPDATE users SET business_status = 'approved' WHERE id = $1", [userId]);
  await query("UPDATE venues SET status = 'approved', featured_rank = GREATEST(featured_rank, 1) WHERE owner_user_id = $1", [userId]);

  // Consume the token so it cannot be reused
  await query("DELETE FROM business_approval_tokens WHERE token = $1", [token]);

  const businessName = user.business_name ?? user.name;

  // Notify the business owner by email
  try {
    await sendBusinessApprovedEmail(user.email, user.name, businessName);
  } catch (err) {
    console.error("[admin] Failed to send approval notification email:", err);
  }

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Tipzy – Business Approved 🎉</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F0F1A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{background:#16213E;border-radius:20px;padding:52px 44px;text-align:center;max-width:480px;width:90%;border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 64px rgba(0,0,0,0.6);}
    .icon{font-size:68px;margin-bottom:24px;}
    h1{font-size:28px;font-weight:800;margin-bottom:14px;}
    .badge{display:inline-block;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);color:#4ADE80;padding:8px 22px;border-radius:50px;font-size:14px;font-weight:700;margin:16px 0 24px;}
    .name{color:#A78BFA;font-weight:700;}
    p{color:#9CA3AF;font-size:15px;line-height:1.65;}
    .note{margin-top:18px;font-size:13px;color:#4B5563;}
    .gradient-line{height:3px;background:linear-gradient(90deg,#7C3AED,#22C55E);border-radius:2px;margin:28px 0 0;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1>Business Approved!</h1>
    <div class="badge">✅ Account Activated</div>
    <p><span class="name">${businessName.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span> has been successfully approved and can now access the full Tipzy business dashboard.</p>
    <p class="note">The business owner will gain access to the business side of the app on their next sign-in.</p>
    <div class="gradient-line"></div>
  </div>
</body>
</html>`, 200);
});

// ── PUBLIC: one-click offer approve/reject via email link ────────────────────
const OFFER_HTML_BASE = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F0F1A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}.card{background:#16213E;border-radius:20px;padding:52px 44px;text-align:center;max-width:480px;width:90%;border:1px solid rgba(255,255,255,0.08);}.icon{font-size:68px;margin-bottom:24px}h1{font-size:26px;font-weight:800;margin-bottom:12px}p{color:#9CA3AF;font-size:15px;line-height:1.65}.badge{display:inline-block;border-radius:50px;padding:8px 22px;font-size:14px;font-weight:700;margin:16px 0 24px;}`;

admin.get("/approve-offer/:token", async (c) => {
  const token = c.req.param("token");

  const tokenRes = await query<{ offer_id: string; action: string }>(
    "SELECT offer_id, action FROM offer_approval_tokens WHERE token = $1",
    [token],
  );
  const row = tokenRes.rows[0];
  if (!row) {
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy</title><style>${OFFER_HTML_BASE}</style></head><body><div class="card"><div class="icon">❌</div><h1>Invalid or Expired Link</h1><p>This link has already been used or is not valid.</p></div></body></html>`, 404);
  }

  const offerId = row.offer_id;
  const action = row.action as "approve" | "reject";

  const offerRes = await query<{ name: string; owner_user_id: string; venue_id: string }>(
    "SELECT name, owner_user_id, venue_id FROM offers WHERE id = $1",
    [offerId],
  );
  const offer = offerRes.rows[0];
  if (!offer) {
    await query("DELETE FROM offer_approval_tokens WHERE offer_id = $1", [offerId]);
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy</title><style>${OFFER_HTML_BASE}</style></head><body><div class="card"><div class="icon">⚠️</div><h1>Offer Not Found</h1><p>This offer may have been deleted.</p></div></body></html>`, 404);
  }

  const newStatus = action === "approve" ? "active" : "rejected";
  await query("UPDATE offers SET status = $1, updated_at = now() WHERE id = $2", [newStatus, offerId]);
  await query("DELETE FROM offer_approval_tokens WHERE offer_id = $1", [offerId]);

  const ownerRes = await query<{ name: string; email: string }>(
    "SELECT name, email FROM users WHERE id = $1",
    [offer.owner_user_id],
  );
  const owner = ownerRes.rows[0];
  const venueRes = await query<{ name: string }>("SELECT name FROM venues WHERE id = $1", [offer.venue_id]);
  const venueName = venueRes.rows[0]?.name ?? offer.venue_id;

  try {
    if (action === "approve") {
      await sendOfferApprovedEmail(owner.email, owner.name, offer.name, venueName);
    } else {
      await sendOfferRejectedEmail(owner.email, owner.name, offer.name, venueName);
    }
  } catch (err) {
    console.error("[admin] Failed to send offer decision email:", err);
  }

  if (action === "approve") {
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy – Offer Approved</title><style>${OFFER_HTML_BASE}</style></head><body><div class="card"><div class="icon">🎉</div><h1>Offer Approved!</h1><div class="badge" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);color:#4ADE80;">✅ Now Live</div><p>The offer <strong style="color:#fff;">"${offer.name.replace(/</g,"&lt;").replace(/>/g,"&gt;")}"</strong> is now visible to all Tipzy customers.</p></div></body></html>`, 200);
  } else {
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy – Offer Rejected</title><style>${OFFER_HTML_BASE}</style></head><body><div class="card"><div class="icon">🚫</div><h1>Offer Rejected</h1><div class="badge" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#F87171;">❌ Not Approved</div><p>The offer <strong style="color:#fff;}">${offer.name.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</strong> has been rejected. The business owner has been notified.</p></div></body></html>`, 200);
  }
});

// ── PUBLIC: one-click sponsor approval via email link ────────────────────────────
const SPONSOR_HTML_BASE = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F0F1A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}.card{background:#16213E;border-radius:20px;padding:52px 44px;text-align:center;max-width:480px;width:90%;border:1px solid rgba(255,255,255,0.08)}.icon{font-size:68px;margin-bottom:24px}h1{font-size:26px;font-weight:800;margin-bottom:12px}p{color:#9CA3AF;font-size:15px;line-height:1.65}.badge{display:inline-block;border-radius:50px;padding:8px 22px;font-size:14px;font-weight:700;margin:16px 0 24px;}`;

admin.get("/approve-sponsor/:token", async (c) => {
  const token = c.req.param("token");

  const tokenRes = await query<{ offer_id: string; action: string }>(
    "SELECT offer_id, action FROM offer_sponsor_tokens WHERE token = $1",
    [token],
  );
  const row = tokenRes.rows[0];
  if (!row) {
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy</title><style>${SPONSOR_HTML_BASE}</style></head><body><div class="card"><div class="icon">❌</div><h1>Invalid or Expired Link</h1><p>This sponsor link has already been used or is not valid.</p></div></body></html>`, 404);
  }

  const offerId = row.offer_id;
  const action  = row.action as "approve" | "reject";

  const offerRes = await query<{ id: string; name: string; owner_user_id: string; venue_id: string }>(
    "SELECT id, name, owner_user_id, venue_id FROM offers WHERE id = $1",
    [offerId],
  );
  const offer = offerRes.rows[0];
  if (!offer) {
    await query("DELETE FROM offer_sponsor_tokens WHERE offer_id = $1", [offerId]);
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy</title><style>${SPONSOR_HTML_BASE}</style></head><body><div class="card"><div class="icon">⚠️</div><h1>Offer Not Found</h1><p>This offer may have been deleted.</p></div></body></html>`, 404);
  }

  if (action === "approve") {
    // Feature for 3 days
    await query(
      `UPDATE offers SET sponsor_status = 'approved', sponsored_until = now() + interval '3 days', updated_at = now() WHERE id = $1`,
      [offerId],
    );
  } else {
    await query("UPDATE offers SET sponsor_status = 'rejected', updated_at = now() WHERE id = $1", [offerId]);
  }
  // Consume both tokens for this offer (approve AND reject token)
  await query("DELETE FROM offer_sponsor_tokens WHERE offer_id = $1", [offerId]);

  const ownerRes = await query<{ name: string; email: string }>(
    "SELECT name, email FROM users WHERE id = $1",
    [offer.owner_user_id],
  );
  const owner = ownerRes.rows[0];
  const venueRes = await query<{ name: string }>("SELECT name FROM venues WHERE id = $1", [offer.venue_id]);
  const venueName = venueRes.rows[0]?.name ?? offer.venue_id;

  try {
    if (action === "approve") {
      await sendSponsorApprovedEmail(owner.email, owner.name, offer.name, venueName);
    } else {
      await sendSponsorRejectedEmail(owner.email, owner.name, offer.name, venueName);
    }
  } catch (err) {
    console.error("[admin] Failed to send sponsor decision email:", err);
  }

  if (action === "approve") {
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy – Sponsor Approved</title><style>${SPONSOR_HTML_BASE}</style></head><body><div class="card"><div class="icon">🌟</div><h1>Sponsorship Approved!</h1><div class="badge" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.5);color:#FCD34D;">⭐ Featured for 3 Days</div><p><strong style="color:#fff;}">${offer.name.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</strong> is now featured at the top of the Tipzy home page.</p></div></body></html>`, 200);
  } else {
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Tipzy – Sponsor Rejected</title><style>${SPONSOR_HTML_BASE}</style></head><body><div class="card"><div class="icon">🚫</div><h1>Sponsorship Rejected</h1><div class="badge" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#F87171;">❌ Not Approved</div><p>The sponsorship request for <strong style="color:#fff;}">${offer.name.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</strong> has been rejected. The business owner has been notified.</p></div></body></html>`, 200);
  }
});

// Admin login – only accepts users with role='admin'
admin.post("/login", async (c) => {
  let body: { email?: string; password?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const { email, password } = body;
  if (!email || !password) return c.json({ error: "email and password are required" }, 400);
  const res = await query<DbUser>("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
  const user = res.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  if (user.role !== "admin") return c.json({ error: "Not an admin account" }, 403);
  const accessToken = await signAccessToken(user.id, user.email, "admin");
  const refreshToken = await signRefreshToken(user.id, "admin");
  await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [refreshToken, user.id]);
  return c.json({
    message: "Admin login successful",
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "admin" as const,
      createdAt: user.created_at,
      emailVerified: true, // Admins bypass email verification
    },
  });
});

// ── GET /api/admin/dashboard – Standalone web admin panel (public, auth client-side) ─
admin.get("/dashboard", (c) => {
  const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? process.env.API_BASE_URL ?? "").replace(/\/+$/, "");
  return c.html(getAdminDashboardHTML(apiBase));
});

// All admin routes require authentication + admin role
admin.use("*", requireAuth, requireRole("admin"));

// List all users
admin.get("/users", async (c) => {
  const res = await query<DbUser>(
    "SELECT id, email, name, role, business_name, business_status, created_at FROM users ORDER BY created_at DESC",
  );
  const list = res.rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    businessName: u.business_name,
    businessStatus: u.business_status,
    createdAt: u.created_at,
  }));
  return c.json({ users: list, total: list.length });
});

// Change a user's role
admin.patch("/users/:id/role", async (c) => {
  let body: { role?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { role } = body;
  if (!role || !["customer", "business", "admin"].includes(role)) {
    return c.json({ error: "role must be one of: customer, business, admin" }, 400);
  }

  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT id FROM users WHERE id = $1", [id]);
  if (!res.rowCount) return c.json({ error: "User not found" }, 404);

  await query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return c.json({ message: `Role updated to ${role}`, user: { id, role } });
});

// Approve a business account
admin.patch("/business/:id/approve", async (c) => {
  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT id, role, email, name, business_name FROM users WHERE id = $1", [id]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 400);

  await query("UPDATE users SET business_status = 'approved' WHERE id = $1", [id]);
  await query("UPDATE venues SET status = 'approved', featured_rank = GREATEST(featured_rank, 1) WHERE owner_user_id = $1", [id]);

  // Notify the business owner by email
  try {
    await sendBusinessApprovedEmail(user.email, user.name, user.business_name ?? user.name);
  } catch (err) {
    console.error("[admin] Failed to send approval email:", err);
  }

  return c.json({ message: "Business approved", user: { id, businessStatus: "approved" } });
});

// Reject a business account
admin.patch("/business/:id/reject", async (c) => {
  let body: { reason?: string };
  try { body = await c.req.json(); } catch { body = {}; }

  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT id, role, email, name, business_name FROM users WHERE id = $1", [id]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 400);

  await query("UPDATE users SET business_status = 'rejected' WHERE id = $1", [id]);

  // Notify the business owner by email
  try {
    await sendBusinessRejectedEmail(user.email, user.name, user.business_name ?? user.name, body.reason);
  } catch (err) {
    console.error("[admin] Failed to send rejection email:", err);
  }

  return c.json({ message: "Business rejected", reason: body.reason ?? null });
});

// Delete any user (admin can delete any account)
admin.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT id FROM users WHERE id = $1", [id]);
  if (!res.rowCount) return c.json({ error: "User not found" }, 404);

  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);
  await query("DELETE FROM users WHERE id = $1", [id]);
  return c.json({ message: "User deleted" });
});

// Reset a user's password (admin action)
admin.patch("/users/:id/reset-password", async (c) => {
  let body: { newPassword?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { newPassword } = body;
  if (!newPassword || newPassword.length < 6) return c.json({ error: "newPassword must be at least 6 characters" }, 400);

  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT id FROM users WHERE id = $1", [id]);
  if (!res.rowCount) return c.json({ error: "User not found" }, 404);

  const newHash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, id]);
  return c.json({ message: "Password reset successfully" });
});

// Resend business approval email
admin.post("/business/:id/resend-approval", async (c) => {
  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT id, email, name, business_name, business_status FROM users WHERE id = $1", [id]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.business_status !== "approved") return c.json({ error: "Business is not approved yet" }, 400);
  try {
    await sendBusinessApprovedEmail(user.email, user.name, user.business_name ?? user.name);
  } catch (err) {
    console.error("[admin] Failed to resend approval email:", err);
    return c.json({ error: "Failed to send email" }, 500);
  }
  return c.json({ message: `Approval email resent to ${user.email}` });
});

// List all venues (admin)
admin.get("/venues", async (c) => {
  const res = await query<{ id: string; name: string; address: string; status: string; featured_rank: number; owner_user_id: string }>(
    "SELECT id, name, address, status, featured_rank, owner_user_id FROM venues ORDER BY featured_rank DESC, name ASC",
  );
  return c.json({ venues: res.rows });
});

// Update a venue's featured rank
admin.patch("/venues/:id/featured-rank", async (c) => {
  const venueId = c.req.param("id");
  let body: { featuredRank?: number };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { featuredRank } = body;
  if (typeof featuredRank !== "number" || featuredRank < 0 || !Number.isInteger(featuredRank)) {
    return c.json({ error: "featuredRank must be a non-negative integer" }, 400);
  }

  const check = await query("SELECT id FROM venues WHERE id = $1", [venueId]);
  if (!check.rowCount) return c.json({ error: "Venue not found" }, 404);

  await query("UPDATE venues SET featured_rank = $1 WHERE id = $2", [featuredRank, venueId]);
  return c.json({ message: "Featured rank updated", venueId, featuredRank });
});

// ── POST /api/admin/flush-demo-data ─────────────────────────────────────────
// Clears all non-admin content: orders, events, offers, venues, non-admin users,
// subscriptions, payment records, etc. Keeps admin accounts intact.
// Requires admin role + a { confirm: "FLUSH" } body to prevent accidental calls.
admin.post("/flush-demo-data", requireAuth, requireRole("admin"), async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  if (body.confirm !== "FLUSH") {
    return c.json({ error: 'Send { "confirm": "FLUSH" } to proceed' }, 400);
  }

  // Tables to clear (order matters for FK constraints)
  const steps = [
    "DELETE FROM payment_audit_log",
    "DELETE FROM account_actions",
    "DELETE FROM subscriptions",
    "DELETE FROM user_payment_methods",
    "DELETE FROM orders",
    "DELETE FROM capacity_log",
    "DELETE FROM venue_views",
    "DELETE FROM offers",
    "DELETE FROM events",
    "DELETE FROM venues",
    "DELETE FROM users WHERE role != 'admin'",
  ];

  for (const sql of steps) {
    try { await query(sql, []); } catch { /* best-effort: table may not exist */ }
  }

  return c.json({ message: "Demo data flushed. Admin accounts preserved." });
});

export default admin;

// ─────────────────────────────────────────────────────────────────────────────
// HTML admin dashboard (self-contained SPA)
// ─────────────────────────────────────────────────────────────────────────────
function getAdminDashboardHTML(apiBase: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Tipzy Admin</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --bg:#0f0f1a;--sidebar:#13131f;--card:#1a1a2e;--border:rgba(255,255,255,0.08);
    --purple:#7c3aed;--purple-light:#a78bfa;--cyan:#06b6d4;--green:#22c55e;
    --red:#ef4444;--yellow:#f59e0b;--text:#f1f5f9;--muted:#94a3b8;--faint:#334155;
  }
  html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);font-size:14px}
  /* Layout */
  #app{display:flex;height:100vh;overflow:hidden}
  /* Login */
  #login-screen{display:flex;align-items:center;justify-content:center;height:100vh;width:100%;background:var(--bg)}
  .login-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px 36px;width:360px}
  .login-card h1{font-size:22px;font-weight:700;margin-bottom:6px}
  .login-card p{color:var(--muted);font-size:13px;margin-bottom:28px}
  .login-logo{font-size:32px;margin-bottom:16px;text-align:center}
  /* Sidebar */
  #sidebar{width:220px;min-width:220px;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:0}
  .sidebar-logo{padding:22px 20px 16px;font-size:18px;font-weight:800;color:var(--purple-light);letter-spacing:-0.5px;border-bottom:1px solid var(--border)}
  .sidebar-logo span{color:var(--muted);font-weight:400;font-size:11px;display:block;margin-top:2px}
  nav{flex:1;padding:12px 8px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;color:var(--muted);transition:background 0.15s,color 0.15s;font-size:13px;font-weight:500;border:none;background:none;width:100%;text-align:left}
  .nav-item:hover{background:rgba(124,58,237,0.12);color:var(--text)}
  .nav-item.active{background:rgba(124,58,237,0.2);color:var(--purple-light)}
  .nav-item svg{flex-shrink:0}
  .sidebar-footer{padding:12px 8px;border-top:1px solid var(--border)}
  /* Main */
  #main{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:56px;border-bottom:1px solid var(--border);background:var(--sidebar);flex-shrink:0}
  .topbar-title{font-size:15px;font-weight:600}
  .topbar-user{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(124,58,237,0.2);color:var(--purple-light)}
  #content{flex:1;overflow-y:auto;padding:24px}
  /* Cards */
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
  @media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)}}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
  .stat-card .label{font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px}
  .stat-card .value{font-size:26px;font-weight:700}
  .stat-card .sub{font-size:12px;color:var(--muted);margin-top:4px}
  /* Section */
  .section{background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:20px;overflow:hidden}
  .section-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)}
  .section-header h2{font-size:15px;font-weight:600}
  .section-body{padding:0}
  /* Table */
  table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:10px 20px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);background:rgba(0,0,0,0.2)}
  td{padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:rgba(255,255,255,0.02)}
  /* Status badges */
  .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
  .status-pending{background:rgba(245,158,11,0.15);color:#fbbf24}
  .status-approved{background:rgba(34,197,94,0.15);color:#4ade80}
  .status-rejected{background:rgba(239,68,68,0.15);color:#f87171}
  .status-admin{background:rgba(124,58,237,0.2);color:var(--purple-light)}
  .status-business{background:rgba(6,182,212,0.15);color:#22d3ee}
  .status-customer{background:rgba(148,163,184,0.15);color:var(--muted)}
  /* Buttons */
  .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:opacity 0.15s}
  .btn:hover{opacity:0.85}
  .btn:disabled{opacity:0.4;cursor:not-allowed}
  .btn-primary{background:var(--purple);color:#fff}
  .btn-success{background:var(--green);color:#fff}
  .btn-danger{background:var(--red);color:#fff}
  .btn-ghost{background:rgba(255,255,255,0.07);color:var(--text)}
  .btn-sm{padding:5px 10px;font-size:11px}
  /* Form */
  .form-group{margin-bottom:16px}
  .form-group label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
  .form-input{width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text);outline:none;transition:border-color 0.15s}
  .form-input:focus{border-color:var(--purple)}
  .form-input::placeholder{color:var(--faint)}
  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000}
  .modal{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;width:440px;max-width:95vw}
  .modal h3{font-size:16px;font-weight:700;margin-bottom:16px}
  .modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
  /* Spinner */
  .spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--purple);border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block}
  @keyframes spin{to{transform:rotate(360deg)}}
  /* Toast */
  #toast{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px}
  .toast{padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.5);animation:fadeIn 0.25s ease;max-width:320px}
  .toast-success{background:#064e3b;border:1px solid #059669;color:#6ee7b7}
  .toast-error{background:#450a0a;border:1px solid #dc2626;color:#fca5a5}
  .toast-info{background:#1e1b4b;border:1px solid var(--purple);color:var(--purple-light)}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  /* Danger zone */
  .danger-box{background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px}
  /* Rank pill */
  .rank-pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(124,58,237,0.2);color:var(--purple-light)}
  .rank-0{background:rgba(148,163,184,0.1);color:var(--muted)}
  /* Empty state */
  .empty{text-align:center;padding:40px 20px;color:var(--muted);font-size:13px}
  /* Page title */
  .page-title{font-size:20px;font-weight:700;margin-bottom:20px}
  /* Hidden */
  .hidden{display:none!important}
</style>
</head>
<body>

<!-- Login Screen -->
<div id="login-screen">
  <div class="login-card">
    <div class="login-logo">🍸</div>
    <h1>Tipzy Admin</h1>
    <p>Sign in with your admin account to continue</p>
    <div class="form-group">
      <label>Email</label>
      <input class="form-input" id="login-email" type="email" placeholder="admin@tipzy.com" autocomplete="username"/>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input class="form-input" id="login-password" type="password" placeholder="••••••••" autocomplete="current-password"/>
    </div>
    <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" id="login-btn" onclick="doLogin()">Sign In</button>
    <div id="login-error" style="color:#f87171;font-size:12px;margin-top:10px;text-align:center"></div>
  </div>
</div>

<!-- App Shell -->
<div id="app" class="hidden">
  <!-- Sidebar -->
  <div id="sidebar">
    <div class="sidebar-logo">🍸 Tipzy<span>Admin Dashboard</span></div>
    <nav>
      <button class="nav-item active" onclick="showPage('overview')" id="nav-overview">
        ${icon('grid')} Overview
      </button>
      <button class="nav-item" onclick="showPage('requests')" id="nav-requests">
        ${icon('bell')} Business Requests <span id="req-badge" class="badge hidden" style="margin-left:auto"></span>
      </button>
      <button class="nav-item" onclick="showPage('users')" id="nav-users">
        ${icon('users')} Users
      </button>
      <button class="nav-item" onclick="showPage('venues')" id="nav-venues">
        ${icon('map-pin')} Venues
      </button>
      <button class="nav-item" onclick="showPage('danger')" id="nav-danger">
        ${icon('alert')} Danger Zone
      </button>
    </nav>
    <div class="sidebar-footer">
      <button class="nav-item" style="color:var(--red)" onclick="doLogout()">
        ${icon('logout')} Sign Out
      </button>
    </div>
  </div>

  <!-- Main -->
  <div id="main">
    <div class="topbar">
      <span class="topbar-title" id="topbar-title">Overview</span>
      <div class="topbar-user">
        <span id="topbar-name"></span>
        <span class="badge">Admin</span>
        <button class="btn btn-ghost btn-sm" onclick="refreshCurrentPage()">↻ Refresh</button>
      </div>
    </div>
    <div id="content">

      <!-- OVERVIEW PAGE -->
      <div id="page-overview">
        <div class="page-title">Dashboard Overview</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Total Users</div>
            <div class="value" id="stat-users">—</div>
            <div class="sub" id="stat-users-sub"></div>
          </div>
          <div class="stat-card">
            <div class="label">Businesses</div>
            <div class="value" id="stat-biz">—</div>
            <div class="sub" id="stat-biz-sub" style="color:var(--yellow)"></div>
          </div>
          <div class="stat-card">
            <div class="label">Approved Venues</div>
            <div class="value" id="stat-venues">—</div>
            <div class="sub" id="stat-venues-sub"></div>
          </div>
          <div class="stat-card">
            <div class="label">Pending Requests</div>
            <div class="value" id="stat-pending" style="color:var(--yellow)">—</div>
            <div class="sub" style="color:var(--yellow)">Needs review</div>
          </div>
        </div>

        <!-- Sign-up counters -->
        <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:16px">
          <div class="stat-card">
            <div class="label">New Sign-ups Today</div>
            <div class="value" id="stat-today" style="color:var(--cyan)">—</div>
            <div class="sub" id="stat-today-sub" style="color:var(--muted)"></div>
          </div>
          <div class="stat-card">
            <div class="label">New Sign-ups This Week</div>
            <div class="value" id="stat-week" style="color:var(--purple-light)">—</div>
            <div class="sub" id="stat-week-sub" style="color:var(--muted)"></div>
          </div>
        </div>

        <!-- Sign-up Trend Chart -->
        <div class="section" style="margin-bottom:20px">
          <div class="section-header">
            <h2>Sign-up Trend — Last 14 Days</h2>
            <span id="signup-chart-total" style="font-size:12px;color:var(--muted)"></span>
          </div>
          <div style="padding:20px 20px 12px">
            <div id="signup-chart" style="display:flex;align-items:flex-end;gap:5px;height:80px"></div>
            <div id="signup-chart-labels" style="display:flex;gap:5px;margin-top:8px"></div>
          </div>
        </div>

        <!-- Recent Users -->
        <div class="section">
          <div class="section-header">
            <h2>Recent Registrations</h2>
            <button class="btn btn-ghost btn-sm" onclick="loadOverview()">↻</button>
          </div>
          <div class="section-body">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Business</th><th>Joined</th></tr></thead>
              <tbody id="recent-users-table"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- REQUESTS PAGE -->
      <div id="page-requests" class="hidden">
        <div class="page-title">Business Requests</div>
        <div class="section">
          <div class="section-header">
            <h2>Pending Approvals</h2>
            <button class="btn btn-ghost btn-sm" onclick="loadRequests()">↻ Refresh</button>
          </div>
          <div class="section-body">
            <table>
              <thead><tr><th>Business Name</th><th>Owner</th><th>Email</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody id="requests-table"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- USERS PAGE -->
      <div id="page-users" class="hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div class="page-title" style="margin:0">All Users</div>
          <div style="display:flex;gap:10px;align-items:center">
            <input class="form-input" id="user-search" style="width:220px" placeholder="Search name or email…" oninput="filterUsers()"/>
            <button class="btn btn-ghost btn-sm" onclick="loadUsers()">↻</button>
          </div>
        </div>
        <div class="section">
          <div class="section-body">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Business</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody id="users-table"><tr><td colspan="6" class="empty">Loading…</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VENUES PAGE -->
      <div id="page-venues" class="hidden">
        <div class="page-title">Venue Management</div>
        <div class="section">
          <div class="section-header">
            <h2>All Venues</h2>
            <button class="btn btn-ghost btn-sm" onclick="loadVenues()">↻</button>
          </div>
          <div class="section-body">
            <table>
              <thead><tr><th>Name</th><th>Address</th><th>Status</th><th>Featured Rank</th><th>Actions</th></tr></thead>
              <tbody id="venues-table"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- DANGER PAGE -->
      <div id="page-danger" class="hidden">
        <div class="page-title">Danger Zone</div>
        <div class="danger-box">
          <div style="font-size:15px;font-weight:700;color:var(--red);margin-bottom:8px">⚠️ Flush All Demo Data</div>
          <p style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:16px">
            Permanently deletes ALL venues, events, orders, offers, subscriptions, and all non-admin users.<br/>
            <strong style="color:var(--red)">This cannot be undone.</strong> Admin accounts are preserved.
          </p>
          <button class="btn btn-danger" onclick="confirmFlush()">🗑 Flush All Demo Data</button>
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /app -->

<!-- Reject Modal -->
<div id="reject-modal" class="modal-overlay hidden">
  <div class="modal">
    <h3>Reject Business Application</h3>
    <div class="form-group">
      <label>Reason (optional — sent to the owner)</label>
      <textarea class="form-input" id="reject-reason" rows="3" placeholder="e.g. Incomplete information provided…" style="resize:vertical"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('reject-modal')">Cancel</button>
      <button class="btn btn-danger" onclick="submitReject()">Reject & Notify</button>
    </div>
  </div>
</div>

<!-- Rank Modal -->
<div id="rank-modal" class="modal-overlay hidden">
  <div class="modal">
    <h3>Set Featured Rank</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Rank 0 = not featured. Lower numbers appear first.</p>
    <div class="form-group">
      <label>Venue</label>
      <input class="form-input" id="rank-venue-name" disabled/>
    </div>
    <div class="form-group">
      <label>Featured Rank</label>
      <input class="form-input" id="rank-value" type="number" min="0" placeholder="0"/>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('rank-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="submitRank()">Save Rank</button>
    </div>
  </div>
</div>

<!-- Reset Password Modal -->
<div id="reset-modal" class="modal-overlay hidden">
  <div class="modal">
    <h3>Reset User Password</h3>
    <div class="form-group">
      <label>New Password (min 6 chars)</label>
      <input class="form-input" id="reset-password" type="password" placeholder="New password"/>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('reset-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="submitReset()">Reset Password</button>
    </div>
  </div>
</div>

<!-- Toast container -->
<div id="toast"></div>

<script>
// ── Config ────────────────────────────────────────────────────────────────────
const API = '${apiBase}/api';

// ── State ─────────────────────────────────────────────────────────────────────
let token = localStorage.getItem('tipzy_admin_token') || '';
let adminName = localStorage.getItem('tipzy_admin_name') || '';
let activePage = 'overview';
let allUsers = [];
let pendingRejectId = null;
let pendingRankVenueId = null;
let pendingResetUserId = null;

// ── Boot ─────────────────────────────────────────────────────────────────────
if (token) { showApp(); }

// ── Auth ─────────────────────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  if (!email || !pw) { err.textContent = 'Enter email and password.'; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  err.textContent = '';
  try {
    const res = await fetch(API + '/admin/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password: pw }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Login failed'; btn.disabled=false; btn.textContent='Sign In'; return; }
    token = data.token;
    adminName = data.user?.name || email;
    localStorage.setItem('tipzy_admin_token', token);
    localStorage.setItem('tipzy_admin_name', adminName);
    showApp();
  } catch(e) { err.textContent = 'Network error. Is the server running?'; btn.disabled=false; btn.textContent='Sign In'; }
}

document.getElementById('login-password').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
document.getElementById('login-email').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('topbar-name').textContent = adminName;
  showPage('overview');
}

function doLogout() {
  token = ''; adminName = '';
  localStorage.removeItem('tipzy_admin_token');
  localStorage.removeItem('tipzy_admin_name');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-email').value='';
  document.getElementById('login-password').value='';
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(page) {
  ['overview','requests','users','venues','danger'].forEach(p => {
    document.getElementById('page-'+p).classList.add('hidden');
    document.getElementById('nav-'+p).classList.remove('active');
  });
  document.getElementById('page-'+page).classList.remove('hidden');
  document.getElementById('nav-'+page).classList.add('active');
  const titles = {overview:'Overview',requests:'Business Requests',users:'All Users',venues:'Venues',danger:'Danger Zone'};
  document.getElementById('topbar-title').textContent = titles[page] || page;
  activePage = page;
  if(page==='overview') loadOverview();
  else if(page==='requests') loadRequests();
  else if(page==='users') loadUsers();
  else if(page==='venues') loadVenues();
}

function refreshCurrentPage() { showPage(activePage); }

// ── API helper ────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers:{'Content-Type':'application/json','Authorization':'Bearer '+token} };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) { doLogout(); throw new Error('Session expired'); }
  return res;
}

// ── Overview ──────────────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const [uRes, vRes] = await Promise.all([
      api('GET','/admin/users'),
      api('GET','/admin/venues'),
    ]);
    const { users } = await uRes.json();
    const { venues } = await vRes.json();
    const pending = users.filter(u => u.businessStatus === 'pending');
    const businesses = users.filter(u => u.role === 'business');
    const approved = venues.filter(v => v.status === 'approved');
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-users-sub').textContent = users.filter(u=>u.role==='customer').length + ' customers';
    document.getElementById('stat-biz').textContent = businesses.length;
    document.getElementById('stat-biz-sub').textContent = pending.length + ' pending';
    document.getElementById('stat-venues').textContent = approved.length;
    document.getElementById('stat-venues-sub').textContent = venues.length + ' total';
    document.getElementById('stat-pending').textContent = pending.length;
    // Sign-up counters
    const now = new Date();
    const todayStr = now.toISOString().slice(0,10);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
    const newToday = users.filter(u => u.createdAt && u.createdAt.slice(0,10) === todayStr).length;
    const newWeek = users.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length;
    const newMonth = users.filter(u => u.createdAt && new Date(u.createdAt) >= monthAgo).length;
    document.getElementById('stat-today').textContent = newToday;
    document.getElementById('stat-today-sub').textContent = newMonth + ' this month';
    document.getElementById('stat-week').textContent = newWeek;
    document.getElementById('stat-week-sub').textContent = newMonth + ' this month';
    // 14-day bar chart
    const days = 14;
    const dailyCounts = [];
    const dayLabels = [];
    for(let i = days-1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0,10);
      const count = users.filter(u => u.createdAt && u.createdAt.slice(0,10) === ds).length;
      dailyCounts.push(count);
      dayLabels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
    }
    const maxCount = Math.max(...dailyCounts, 1);
    const totalTrend = dailyCounts.reduce((a,b)=>a+b,0);
    document.getElementById('signup-chart-total').textContent = totalTrend + ' sign-ups in 14 days';
    const chartEl = document.getElementById('signup-chart');
    const labelsEl = document.getElementById('signup-chart-labels');
    chartEl.innerHTML = dailyCounts.map((c,i) => {
      const pct = Math.max((c/maxCount)*100, c>0?4:1);
      const isToday = i === days-1;
      return '<div title="'+dayLabels[i]+': '+c+' sign-up'+(c===1?'':'s')+'" style="flex:1;background:'+(isToday?'var(--cyan)':'var(--purple)');opacity:'+(isToday?'1':'0.7')+';height:'+pct+'%;border-radius:4px 4px 0 0;min-height:'+(c>0?'4':'1')+'px;cursor:default"></div>';
    }).join('');
    labelsEl.innerHTML = dayLabels.map((l,i)=>{
      const isToday = i===days-1;
      return '<div style="flex:1;font-size:9px;color:'+(isToday?'var(--cyan)':'var(--muted)')+';text-align:center;white-space:nowrap;overflow:hidden">'+l+'</div>';
    }).join('');
    // Badge
    const badge = document.getElementById('req-badge');
    if(pending.length>0){badge.textContent=pending.length;badge.classList.remove('hidden');}
    else{badge.classList.add('hidden');}
    // Recent users table
    const tbody = document.getElementById('recent-users-table');
    const recent = users.slice(0,15);
    tbody.innerHTML = recent.length ? recent.map(u => \`
      <tr>
        <td>\${esc(u.name)}</td>
        <td style="color:var(--muted)">\${esc(u.email)}</td>
        <td><span class="status status-\${u.role}">\${u.role}</span></td>
        <td>\${u.businessName ? esc(u.businessName) : '<span style="color:var(--faint)">—</span>'}</td>
        <td style="color:var(--muted)">\${fmt(u.createdAt)}</td>
      </tr>
    \`).join('') : '<tr><td colspan="5" class="empty">No users yet</td></tr>';
  } catch(e) { toast('Failed to load overview: '+e.message,'error'); }
}

// ── Business Requests ─────────────────────────────────────────────────────────
async function loadRequests() {
  const tbody = document.getElementById('requests-table');
  tbody.innerHTML = '<tr><td colspan="5" class="empty"><div class="spinner"></div></td></tr>';
  try {
    const res = await api('GET','/admin/users');
    const { users } = await res.json();
    const pending = users.filter(u => u.businessStatus === 'pending');
    const badge = document.getElementById('req-badge');
    if(pending.length>0){badge.textContent=pending.length;badge.classList.remove('hidden');}
    else{badge.classList.add('hidden');}
    if(!pending.length){tbody.innerHTML='<tr><td colspan="5" class="empty">✅ No pending requests</td></tr>';return;}
    tbody.innerHTML = pending.map(u => \`
      <tr>
        <td style="font-weight:600">\${esc(u.businessName||'—')}</td>
        <td>\${esc(u.name)}</td>
        <td style="color:var(--muted)">\${esc(u.email)}</td>
        <td style="color:var(--muted)">\${fmt(u.createdAt)}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="approveBusiness('\${u.id}')">✓ Approve</button>
          <button class="btn btn-danger btn-sm" style="margin-left:6px" onclick="openReject('\${u.id}')">✗ Reject</button>
        </td>
      </tr>
    \`).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="5" class="empty" style="color:var(--red)">Error loading requests</td></tr>'; }
}

async function approveBusiness(id) {
  if(!confirm('Approve this business? The owner will be notified by email.')) return;
  try {
    await api('PATCH','/admin/business/'+id+'/approve');
    toast('Business approved ✅','success');
    loadRequests(); loadOverview();
  } catch(e){toast('Failed: '+e.message,'error');}
}

function openReject(id) { pendingRejectId=id; document.getElementById('reject-reason').value=''; openModal('reject-modal'); }
async function submitReject() {
  if(!pendingRejectId) return;
  const reason = document.getElementById('reject-reason').value.trim();
  try {
    await api('PATCH','/admin/business/'+pendingRejectId+'/reject',{reason:reason||undefined});
    toast('Business rejected','info');
    closeModal('reject-modal'); pendingRejectId=null;
    loadRequests(); loadOverview();
  } catch(e){toast('Failed: '+e.message,'error');}
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('users-table');
  tbody.innerHTML = '<tr><td colspan="6" class="empty"><div class="spinner"></div></td></tr>';
  try {
    const res = await api('GET','/admin/users');
    const { users } = await res.json();
    allUsers = users;
    renderUsers(allUsers);
  } catch(e){tbody.innerHTML='<tr><td colspan="6" class="empty" style="color:var(--red)">Error loading users</td></tr>';}
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase();
  renderUsers(allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
}

function renderUsers(users) {
  const tbody = document.getElementById('users-table');
  tbody.innerHTML = users.length ? users.map(u => \`
    <tr>
      <td style="font-weight:600">\${esc(u.name)}</td>
      <td style="color:var(--muted)">\${esc(u.email)}</td>
      <td><span class="status status-\${u.role}">\${u.role}</span></td>
      <td>\${u.businessName?esc(u.businessName):'<span style="color:var(--faint)">—</span>'}</td>
      <td>\${u.businessStatus?'<span class="status status-'+u.businessStatus+'">'+u.businessStatus+'</span>':'<span style="color:var(--faint)">—</span>'}</td>
      <td style="white-space:nowrap">
        <select class="form-input" style="width:110px;padding:4px 8px;display:inline-block" onchange="changeRole('\${u.id}',this.value)">
          <option value="customer" \${u.role==='customer'?'selected':''}>customer</option>
          <option value="business" \${u.role==='business'?'selected':''}>business</option>
          <option value="admin" \${u.role==='admin'?'selected':''}>admin</option>
        </select>
        <button class="btn btn-ghost btn-sm" style="margin-left:6px" onclick="openReset('\${u.id}')">🔑</button>
        <button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="deleteUser('\${u.id}','\${esc(u.name)}')">🗑</button>
      </td>
    </tr>
  \`).join('') : '<tr><td colspan="6" class="empty">No users found</td></tr>';
}

async function changeRole(id, role) {
  try {
    await api('PATCH','/admin/users/'+id+'/role',{role});
    toast('Role updated to '+role,'success');
  } catch(e){toast('Failed: '+e.message,'error'); loadUsers();}
}

async function deleteUser(id, name) {
  if(!confirm('Delete user "'+name+'"? This cannot be undone.')) return;
  try {
    await api('DELETE','/admin/users/'+id);
    toast('User deleted','info');
    loadUsers(); loadOverview();
  } catch(e){toast('Failed: '+e.message,'error');}
}

function openReset(id) { pendingResetUserId=id; document.getElementById('reset-password').value=''; openModal('reset-modal'); }
async function submitReset() {
  const pw = document.getElementById('reset-password').value;
  if(!pw||pw.length<6){toast('Password must be at least 6 characters','error');return;}
  try {
    await api('PATCH','/admin/users/'+pendingResetUserId+'/reset-password',{newPassword:pw});
    toast('Password reset','success');
    closeModal('reset-modal'); pendingResetUserId=null;
  } catch(e){toast('Failed: '+e.message,'error');}
}

// ── Venues ────────────────────────────────────────────────────────────────────
async function loadVenues() {
  const tbody = document.getElementById('venues-table');
  tbody.innerHTML = '<tr><td colspan="5" class="empty"><div class="spinner"></div></td></tr>';
  try {
    const res = await api('GET','/admin/venues');
    const { venues } = await res.json();
    tbody.innerHTML = venues.length ? venues.map(v => \`
      <tr>
        <td style="font-weight:600">\${esc(v.name)}</td>
        <td style="color:var(--muted);font-size:12px">\${esc(v.address||'—')}</td>
        <td><span class="status status-\${v.status}">\${v.status}</span></td>
        <td><span class="rank-pill \${v.featured_rank===0?'rank-0':''}">\${v.featured_rank===0?'Not featured':'#'+v.featured_rank}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="openRank('\${v.id}',\${JSON.stringify(esc(v.name))},\${v.featured_rank})">✏️ Set Rank</button>
        </td>
      </tr>
    \`).join('') : '<tr><td colspan="5" class="empty">No venues found</td></tr>';
  } catch(e){tbody.innerHTML='<tr><td colspan="5" class="empty" style="color:var(--red)">Error loading venues</td></tr>';}
}

function openRank(id, name, rank) {
  pendingRankVenueId = id;
  document.getElementById('rank-venue-name').value = name;
  document.getElementById('rank-value').value = rank;
  openModal('rank-modal');
}

async function submitRank() {
  const rankVal = parseInt(document.getElementById('rank-value').value,10);
  if(isNaN(rankVal)||rankVal<0){toast('Enter a number ≥ 0','error');return;}
  try {
    await api('PATCH','/admin/venues/'+pendingRankVenueId+'/featured-rank',{featuredRank:rankVal});
    toast('Featured rank updated ✅','success');
    closeModal('rank-modal'); pendingRankVenueId=null;
    loadVenues();
  } catch(e){toast('Failed: '+e.message,'error');}
}

// ── Danger ────────────────────────────────────────────────────────────────────
function confirmFlush() {
  if(!confirm('⚠️ This will PERMANENTLY delete all venues, events, orders, offers, subscriptions, and all non-admin users. Are you absolutely sure?')) return;
  if(prompt('Type FLUSH to confirm:') !== 'FLUSH') { toast('Cancelled','info'); return; }
  api('POST','/admin/flush-demo-data',{confirm:'FLUSH'})
    .then(r=>r.json())
    .then(d=>{ toast(d.message||'Done','success'); loadOverview(); })
    .catch(e=>toast('Failed: '+e.message,'error'));
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function esc(s){ const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML; }
function fmt(d){ return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'; }
function openModal(id){ document.getElementById(id).classList.remove('hidden'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = 'toast toast-'+type;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(()=>el.remove(), 3500);
}
// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click', e=>{ if(e.target===el) el.classList.add('hidden'); });
});
</script>
</body>
</html>`;
}

function icon(name: string): string {
  const icons: Record<string, string> = {
    grid: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'map-pin': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  };
  return icons[name] ?? '';
}

