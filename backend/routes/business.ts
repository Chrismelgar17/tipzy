/**
 * Business auth routes
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
import { users, refreshTokens } from "../store";
import type { StoredUser } from "../store";

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
  if ([...users.values()].find((u) => u.email === normalised)) {
    return c.json({ error: "Email already exists" }, 409);
  }

  const id = `biz_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  const user: StoredUser = {
    id, email: normalised, name: name.trim(), passwordHash,
    role: "business", phone, businessName, businessCategory,
    businessStatus: "pending", createdAt,
  };
  users.set(id, user);

  const accessToken = await signAccessToken(id, user.email, "business");
  const refreshToken = await signRefreshToken(id, "business");
  refreshTokens.set(refreshToken, id);

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

  const user = [...users.values()].find((u) => u.email === email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  if (user.role !== "business") return c.json({ error: "Not a business account" }, 403);

  const accessToken = await signAccessToken(user.id, user.email, "business");
  const refreshToken = await signRefreshToken(user.id, "business");
  refreshTokens.set(refreshToken, user.id);

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
    const userId = refreshTokens.get(refreshToken);
    if (!userId || userId !== payload.userId) return c.json({ error: "Invalid refresh token" }, 401);

    const user = users.get(userId);
    if (!user) return c.json({ error: "User not found" }, 401);

    refreshTokens.delete(refreshToken);
    const newAccess = await signAccessToken(user.id, user.email, user.role);
    const newRefresh = await signRefreshToken(user.id, user.role);
    refreshTokens.set(newRefresh, user.id);

    return c.json({ token: newAccess, refreshToken: newRefresh });
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }
});

// Me
business.get("/me", requireAuth, (c) => {
  const userId = c.get("userId");
  const user = users.get(userId);
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    businessName: user.businessName, businessCategory: user.businessCategory,
    businessStatus: user.businessStatus, role: user.role, createdAt: user.createdAt,
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
  const user = users.get(userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return c.json({ error: "Current password is incorrect" }, 401);
  }

  user.passwordHash = await hashPassword(newPassword);
  users.set(userId, user);
  return c.json({ message: "Password updated successfully" });
});

export default business;
