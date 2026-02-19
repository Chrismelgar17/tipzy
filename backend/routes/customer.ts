import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';

// ── Secret & helpers ────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'tipzy-dev-secret-change-in-production',
);

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  age?: number;
  role: 'customer';
  createdAt: string;
}

// In-memory store — replace with a real DB in production
const users = new Map<string, StoredUser>();

/** SHA-256 hash via Web Crypto (edge-compatible) */
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateToken(userId: string, email: string, role: string): Promise<string> {
  return new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// ── Router ──────────────────────────────────────────────────────────────────

const customer = new Hono();

/**
 * POST /api/customer/register
 * Body: { name, email, password, age? }
 */
customer.post('/register', async (c) => {
  let body: { name?: string; email?: string; password?: string; age?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { name, email, password, age } = body;

  if (!name || !email || !password) {
    return c.json({ error: 'name, email and password are required' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const normalised = email.trim().toLowerCase();
  const duplicate = [...users.values()].find((u) => u.email === normalised);
  if (duplicate) {
    return c.json({ error: 'Email already exists' }, 409);
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  const user: StoredUser = {
    id,
    email: normalised,
    name: name.trim(),
    passwordHash,
    age,
    role: 'customer',
    createdAt,
  };
  users.set(id, user);

  const token = await generateToken(id, user.email, user.role);

  return c.json(
    {
      message: 'Customer registered successfully',
      user: { id, email: user.email, name: user.name, age, role: 'customer', createdAt },
      token,
    },
    201,
  );
});

/**
 * POST /api/customer/login
 * Body: { email, password }
 */
customer.post('/login', async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: 'email and password are required' }, 400);
  }

  const user = [...users.values()].find((u) => u.email === email.trim().toLowerCase());
  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  if (user.role !== 'customer') {
    return c.json({ error: 'Not a customer account' }, 403);
  }

  const token = await generateToken(user.id, user.email, user.role);

  return c.json({
    message: 'Login successful',
    user: { id: user.id, email: user.email, name: user.name, age: user.age, role: user.role },
    token,
  });
});

/**
 * GET /api/customer/me
 * Header: Authorization: Bearer <token>
 */
customer.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
    const user = users.get(payload.userId as string);
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }
    return c.json({
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export default customer;
