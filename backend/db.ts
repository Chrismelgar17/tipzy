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
  auth_provider?: "google" | "apple" | "phone" | null;
  provider_subject?: string | null;
}

export interface DbVenue {
  id: string;
  owner_user_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  timezone: string;
  hours: string; // JSON string
  min_age: number;
  dress_code: string | null;
  capacity: number;
  current_count: number;
  genres: string; // JSON string
  photos: string; // JSON string
  price_level: number;
  rating: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
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
      email_verified BOOLEAN NOT NULL DEFAULT false,
      auth_provider TEXT CHECK (auth_provider IN ('google','apple','phone')),
      provider_subject TEXT
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

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      hours JSONB NOT NULL DEFAULT '{}',
      min_age INTEGER NOT NULL DEFAULT 18,
      dress_code TEXT,
      capacity INTEGER NOT NULL DEFAULT 100,
      current_count INTEGER NOT NULL DEFAULT 0,
      genres JSONB NOT NULL DEFAULT '[]',
      photos JSONB NOT NULL DEFAULT '[]',
      price_level INTEGER NOT NULL DEFAULT 2,
      rating DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Backfill column for existing deployments
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject TEXT;");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS users_provider_subject_unique ON users (auth_provider, provider_subject) WHERE provider_subject IS NOT NULL;");

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
