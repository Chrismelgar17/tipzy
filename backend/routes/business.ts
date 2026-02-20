/**
 * Business auth routes (Postgres-backed)
 * POST /api/business/register
 * POST /api/business/login
 * POST /api/business/refresh
 * GET  /api/business/me
 * POST /api/business/change-password
 */
import { Hono } from "hono";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  requireAuth,
} from "../auth";
import { query, type DbUser } from "../db";

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

  return c.json({
    message: "Business registered successfully. Account pending approval.",
    user: { id, email: user.email, name: user.name, businessName, businessCategory, businessStatus: "pending", role: "business", createdAt },
    token: accessToken,
    refreshToken,
  }, 201);
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
      businessName: user.businessName, businessStatus: user.businessStatus,
      role: "business", createdAt: user.createdAt,
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
  const userId = c.get("userId");
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

  const userId = c.get("userId");
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

export default business;
