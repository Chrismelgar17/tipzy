/**
 * Customer auth routes (Postgres-backed)
 * POST /api/customer/register
 * POST /api/customer/login
 * POST /api/customer/refresh
 * GET  /api/customer/me
 * POST /api/customer/change-password
 * DELETE /api/customer/account
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
import { query, type DbUser, type DbEmailVerification, type DbPasswordReset } from "../db";
import { sendPasswordResetEmail, sendVerificationEmail } from "../email";
import { verifyAccessToken } from "../auth";

const customer = new Hono();

function generateVerificationToken() {
  // 6-digit numeric code
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

function generateResetToken() {
  return crypto.randomUUID?.() ?? `reset_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Register
customer.post("/register", async (c) => {
  let body: { name?: string; email?: string; password?: string; age?: number; phone?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { name, email, password, age, phone } = body;
  if (!name || !email || !password) return c.json({ error: "name, email and password are required" }, 400);
  if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);

  const normalised = email.trim().toLowerCase();
  const exists = await query<DbUser>("SELECT id FROM users WHERE email = $1", [normalised]);
  if (exists.rowCount && exists.rows.length > 0) {
    return c.json({ error: "Email already exists" }, 409);
  }

  const id = crypto.randomUUID?.() ?? `cust_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const passwordHash = await hashPassword(password);

  const insert = await query<DbUser>(
    `INSERT INTO users (id, email, name, password_hash, role, age, phone, created_at)
     VALUES ($1, $2, $3, $4, 'customer', $5, $6, now())
     RETURNING id, email, name, age, role, created_at, email_verified`,
    [id, normalised, name.trim(), passwordHash, age ?? null, phone ?? null],
  );
  const user = insert.rows[0];

  const accessToken = await signAccessToken(user.id, user.email, "customer");
  const refreshToken = await signRefreshToken(user.id, "customer");
  await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [refreshToken, user.id]);

  // Create email verification token valid for 24h
  const verificationToken = generateVerificationToken();
  await query(
    "INSERT INTO email_verifications (token, user_id, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
    [verificationToken, user.id],
  );

  const mail = await sendVerificationEmail(user.email, verificationToken);

  return c.json({
    message: "Customer registered successfully",
    user: { id: user.id, email: user.email, name: user.name, age: user.age, role: "customer", createdAt: user.created_at, emailVerified: user.email_verified ?? false },
    token: accessToken,
    refreshToken,
    verificationToken, // TODO: send via email provider
    mailPreviewUrl: mail.previewUrl,
  }, 201);
});

// Login
customer.post("/login", async (c) => {
  let body: { email?: string; password?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { email, password } = body;
  if (!email || !password) return c.json({ error: "email and password are required" }, 400);

  const userRes = await query<DbUser>("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
  const user = userRes.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  if (user.role !== "customer") return c.json({ error: "Not a customer account" }, 403);
  if (!user.email_verified) return c.json({ error: "Email not verified" }, 403);

  const accessToken = await signAccessToken(user.id, user.email, "customer");
  const refreshToken = await signRefreshToken(user.id, "customer");
  await query("INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)", [refreshToken, user.id]);

  return c.json({
    message: "Login successful",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      role: "customer",
      createdAt: user.created_at,
      emailVerified: user.email_verified ?? false,
    },
    token: accessToken,
    refreshToken,
  });
});

// Refresh token
customer.post("/refresh", async (c) => {
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
customer.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const res = await query<DbUser>("SELECT * FROM users WHERE id = $1", [userId]);
  const user = res.rows[0];
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ id: user.id, name: user.name, email: user.email, age: user.age, phone: user.phone, role: user.role, createdAt: user.created_at, emailVerified: user.email_verified ?? false });
});

// Change password
customer.post("/change-password", requireAuth, async (c) => {
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

// Request password reset (sends token via email provider; returns token for now)
customer.post("/request-password-reset", async (c) => {
  let body: { email?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const { email } = body;
  if (!email) return c.json({ error: "email is required" }, 400);

  const userRes = await query<DbUser>("SELECT id, email_verified FROM users WHERE email = $1", [email.trim().toLowerCase()]);
  const user = userRes.rows[0];
  if (!user) return c.json({ message: "If that account exists, a reset email has been sent" });
  if (!user.email_verified) return c.json({ error: "Email not verified" }, 403);

  await query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
  const token = generateResetToken();
  await query(
    "INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
    [token, user.id],
  );

  const mail = await sendPasswordResetEmail(user.email, token);
  return c.json({ message: "Password reset requested", resetToken: token, mailPreviewUrl: mail.previewUrl });
});

// Reset password using token
customer.post("/reset-password", async (c) => {
  let body: { token?: string; newPassword?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { token, newPassword } = body;
  if (!token || !newPassword) return c.json({ error: "token and newPassword are required" }, 400);
  if (newPassword.length < 6) return c.json({ error: "New password must be at least 6 characters" }, 400);

  const res = await query<DbPasswordReset>("SELECT token, user_id, expires_at FROM password_resets WHERE token = $1", [token]);
  const row = res.rows[0];
  if (!row) return c.json({ error: "Invalid token" }, 400);

  const expired = new Date(row.expires_at).getTime() < Date.now();
  if (expired) {
    await query("DELETE FROM password_resets WHERE token = $1", [token]);
    return c.json({ error: "Token expired" }, 400);
  }

  const newHash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, row.user_id]);
  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [row.user_id]);
  await query("DELETE FROM password_resets WHERE user_id = $1", [row.user_id]);

  return c.json({ message: "Password reset successfully" });
});

// Request verification email (auth optional; accepts email for users who cannot log in yet)
customer.post("/request-verification", async (c) => {
  let body: { email?: string } = {};
  try { body = await c.req.json(); } catch { /* ignore body parse errors */ }

  const auth = c.req.header("Authorization");
  let user: DbUser | undefined;

  // Try auth header first
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(auth.slice(7));
      const res = await query<DbUser>("SELECT id, email, email_verified FROM users WHERE id = $1", [payload.userId]);
      user = res.rows[0];
    } catch { /* fall back to email lookup */ }
  }

  // Fallback to email lookup
  if (!user && body.email) {
    const res = await query<DbUser>("SELECT id, email, email_verified FROM users WHERE email = $1", [body.email.trim().toLowerCase()]);
    user = res.rows[0];
  }

  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.email_verified) return c.json({ message: "Email already verified" });

  await query("DELETE FROM email_verifications WHERE user_id = $1", [user.id]);
  const token = generateVerificationToken();
  await query(
    "INSERT INTO email_verifications (token, user_id, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
    [token, user.id],
  );
  const mail = await sendVerificationEmail(user.email, token);
  return c.json({ message: "Verification email requested", verificationToken: token, mailPreviewUrl: mail.previewUrl });
});

// Verify email with token
customer.post("/verify", async (c) => {
  let body: { token?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const { token } = body;
  if (!token) return c.json({ error: "token is required" }, 400);

  const res = await query<DbEmailVerification>(
    "SELECT token, user_id, expires_at FROM email_verifications WHERE token = $1",
    [token],
  );
  const row = res.rows[0];
  if (!row) return c.json({ error: "Invalid token" }, 400);

  const expired = new Date(row.expires_at).getTime() < Date.now();
  if (expired) {
    await query("DELETE FROM email_verifications WHERE token = $1", [token]);
    return c.json({ error: "Token expired" }, 400);
  }

  await query("UPDATE users SET email_verified = true WHERE id = $1", [row.user_id]);
  await query("DELETE FROM email_verifications WHERE user_id = $1", [row.user_id]);
  return c.json({ message: "Email verified" });
});

// Delete account
customer.delete("/account", requireAuth, async (c) => {
  const userId = c.get("userId");
  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  await query("DELETE FROM users WHERE id = $1", [userId]);
  return c.json({ message: "Account deleted successfully" });
});

export default customer;
