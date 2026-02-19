/**
 * Shared auth utilities: PBKDF2 hashing, JWT sign/verify, middleware.
 * Used by customer, business, and admin routes.
 */
import { Context, Next } from 'hono';
import { SignJWT, jwtVerify } from 'jose';

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'tipzy-dev-secret-change-in-production',
);
export const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_SECRET ?? 'tipzy-refresh-secret-change-in-production',
);

export type Role = 'customer' | 'business' | 'admin';

// ── PBKDF2 password hashing (more secure than plain SHA-256) ────────────────

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const salt = enc.encode('tipzy-static-salt'); // use per-user salt in production
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    keyMaterial, 256,
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ── JWT helpers ─────────────────────────────────────────────────────────────

export async function signAccessToken(userId: string, email: string, role: Role): Promise<string> {
  return new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')   // Short-lived access token
    .sign(JWT_SECRET);
}

export async function signRefreshToken(userId: string, role: Role): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')   // Long-lived refresh token
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as { userId: string; email: string; role: Role; exp: number };
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return payload as { userId: string; role: Role; exp: number };
}

// ── Auth middleware ──────────────────────────────────────────────────────────

export type AuthVariables = {
  userId: string;
  email: string;
  role: Role;
};

/**
 * requireAuth – attaches userId/email/role to the context.
 * Returns 401 if the token is missing or expired.
 */
export async function requireAuth(c: Context, next: Next) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }
  try {
    const payload = await verifyAccessToken(auth.slice(7));
    c.set('userId', payload.userId);
    c.set('email', payload.email);
    c.set('role', payload.role);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

/**
 * requireRole – ensures the authenticated user has one of the allowed roles.
 */
export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const role = c.get('role') as Role | undefined;
    if (!role || !roles.includes(role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}
