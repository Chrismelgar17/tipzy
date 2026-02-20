import { Pool } from "pg";
import { hashPassword } from "./auth";

export type Role = "customer" | "business" | "admin";

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  age: number | null;
  created_at: string;
  business_name: string | null;
  business_category: string | null;
  business_status: "pending" | "approved" | "rejected" | null;
  email_verified?: boolean | null;
}

export interface DbEmailVerification {
  token: string;
  user_id: string;
  expires_at: string;
}

export interface DbPasswordReset {
  token: string;
  user_id: string;
  expires_at: string;
}

const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tipzy";

export const pool = new Pool({
  connectionString,
  max: 10,
  ssl: process.env.PGSSL?.toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
});

const initPromise = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer','business','admin')),
      phone TEXT,
      age INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      business_name TEXT,
      business_category TEXT,
      business_status TEXT CHECK (business_status IN ('pending','approved','rejected')),
      email_verified BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  // Backfill column for existing deployments
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;");

  await ensureAdminSeed();
})();

export async function ready() {
  await initPromise;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  await ready();
  return pool.query(text, params);
}

async function ensureAdminSeed() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tipzy.app";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
  if (existing.rowCount && existing.rows[0]?.id) return;

  const id = crypto.randomUUID?.() ?? `admin_${Date.now()}`;
  const password_hash = await hashPassword(adminPassword);
  await pool.query(
    `INSERT INTO users (id, email, name, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, 'admin', now())
     ON CONFLICT (email) DO NOTHING`,
    [id, adminEmail, "Tipzy Admin", password_hash],
  );
}
