-- Postgres schema for Tipzy backend
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

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_subject_unique
  ON users (auth_provider, provider_subject)
  WHERE provider_subject IS NOT NULL;

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

-- Seed admin (optional if not present)
INSERT INTO users (id, email, name, password_hash, role)
VALUES ('admin_seed', 'admin@tipzy.app', 'Tipzy Admin', '__PENDING__', 'admin')
ON CONFLICT (email) DO NOTHING;
