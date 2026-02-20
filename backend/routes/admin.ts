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

const admin = new Hono();

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
  const res = await query<DbUser>("SELECT role FROM users WHERE id = $1", [id]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 400);

  await query("UPDATE users SET business_status = 'approved' WHERE id = $1", [id]);
  return c.json({ message: "Business approved", user: { id, businessStatus: "approved" } });
});

// Reject a business account
admin.patch("/business/:id/reject", async (c) => {
  let body: { reason?: string };
  try { body = await c.req.json(); } catch { body = {}; }

  const id = c.req.param("id");
  const res = await query<DbUser>("SELECT role FROM users WHERE id = $1", [id]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 400);

  await query("UPDATE users SET business_status = 'rejected' WHERE id = $1", [id]);
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
