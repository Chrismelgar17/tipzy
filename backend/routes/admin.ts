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
import { requireAuth, requireRole, hashPassword } from "../auth";
import { query, type DbUser } from "../db";
import { sendBusinessApprovedEmail, sendBusinessRejectedEmail } from "../email";

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
  await query("UPDATE venues SET status = 'approved' WHERE owner_user_id = $1", [userId]);

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
  await query("UPDATE venues SET status = 'approved' WHERE owner_user_id = $1", [id]);

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

export default admin;
