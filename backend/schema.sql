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

-- ── Phase 3: Business Operations ──────────────────────────────────────────────

-- Orders placed by customers for venue products / events
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_id TEXT,
  product_name TEXT NOT NULL DEFAULT 'General Entry',
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Business-facing status lifecycle:
  --   pending → accepted | rejected
  --   accepted → completed
  --   completed → refunded
  business_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (business_status IN ('pending','accepted','rejected','completed','refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_venue_id_idx ON orders (venue_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx  ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders (business_status);

-- Audit log of every capacity check-in / check-out event
CREATE TABLE IF NOT EXISTS capacity_log (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  count_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS capacity_log_venue_idx ON capacity_log (venue_id, created_at DESC);

-- Tracks every customer view of a venue detail page
CREATE TABLE IF NOT EXISTS venue_views (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  viewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venue_views_venue_idx ON venue_views (venue_id, viewed_at DESC);

-- One-time tokens for email-based business approval
CREATE TABLE IF NOT EXISTS business_approval_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed admin (optional if not present)
INSERT INTO users (id, email, name, password_hash, role)
VALUES ('admin_seed', 'admin@tipzy.app', 'Tipzy Admin', '__PENDING__', 'admin')
ON CONFLICT (email) DO NOTHING;
