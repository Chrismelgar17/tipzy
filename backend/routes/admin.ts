/**
 * Admin routes (requires admin role)
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
import { users, refreshTokens } from "../store";
import type { Role } from "../store";

const admin = new Hono();

// All admin routes require authentication + admin role
admin.use("*", requireAuth, requireRole("admin"));

// List all users
admin.get("/users", (c) => {
  const list = [...users.values()].map((u) => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    businessName: u.businessName, businessStatus: u.businessStatus,
    createdAt: u.createdAt,
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

  const user = users.get(c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);

  user.role = role as Role;
  users.set(user.id, user);
  return c.json({ message: `Role updated to ${role}`, user: { id: user.id, email: user.email, role: user.role } });
});

// Approve a business account
admin.patch("/business/:id/approve", (c) => {
  const user = users.get(c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 400);

  user.businessStatus = "approved";
  users.set(user.id, user);
  return c.json({ message: "Business approved", user: { id: user.id, businessName: user.businessName, businessStatus: "approved" } });
});

// Reject a business account
admin.patch("/business/:id/reject", async (c) => {
  let body: { reason?: string };
  try { body = await c.req.json(); } catch { body = {}; }

  const user = users.get(c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 400);

  user.businessStatus = "rejected";
  users.set(user.id, user);
  return c.json({ message: "Business rejected", reason: body.reason ?? null });
});

// Delete any user (admin can delete any account)
admin.delete("/users/:id", (c) => {
  const id = c.req.param("id");
  if (!users.has(id)) return c.json({ error: "User not found" }, 404);

  users.delete(id);
  for (const [token, uid] of refreshTokens.entries()) {
    if (uid === id) refreshTokens.delete(token);
  }
  return c.json({ message: "User deleted" });
});

// Reset a user's password (admin action)
admin.patch("/users/:id/reset-password", async (c) => {
  let body: { newPassword?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { newPassword } = body;
  if (!newPassword || newPassword.length < 6) return c.json({ error: "newPassword must be at least 6 characters" }, 400);

  const user = users.get(c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);

  user.passwordHash = await hashPassword(newPassword);
  users.set(user.id, user);
  return c.json({ message: "Password reset successfully" });
});

export default admin;
