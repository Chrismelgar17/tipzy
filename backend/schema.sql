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

-- ── Phase 4: Stripe Payment Engine ───────────────────────────────────────────

-- Add Stripe customer ID to users (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Saved payment methods (one row per Stripe PaymentMethod object)
CREATE TABLE IF NOT EXISTS user_payment_methods (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  card_brand               TEXT,        -- visa, mastercard, amex, etc.
  card_last4               TEXT,
  card_exp_month           INTEGER,
  card_exp_year            INTEGER,
  is_default               BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upm_user_id_idx ON user_payment_methods (user_id);

-- Subscriptions (one row per user; upserted by Stripe webhook)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT UNIQUE,
  stripe_payment_method_id TEXT,
  plan                     TEXT NOT NULL
    CHECK (plan IN ('customer_monthly', 'business_monthly')),
  status                   TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid')),
  trial_start              TIMESTAMPTZ,
  trial_end                TIMESTAMPTZ,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  canceled_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique
  ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_idx
  ON subscriptions (stripe_subscription_id);

-- ── Phase 4.1: 3+ plan tiers, payment audit, refunds, account actions ─────────

-- Expand plan check to support 4 branded tiers (idempotent via drop + re-add)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN (
    'customer_monthly',  -- Tipzy Plus      $4.99 /mo   7-day trial
    'customer_pro',      -- Tipzy Pro       $9.99 /mo   7-day trial
    'business_monthly',  -- Biz Starter    $29.99 /mo  30-day trial
    'business_pro'       -- Biz Pro        $59.99 /mo  90-day trial
  ));

-- Account suspension fields on users (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN    NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Immutable payment audit ledger ─────────────────────────────────────────────
-- Every Stripe event and internal billing action is written here for compliance.
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id                     TEXT        PRIMARY KEY,
  user_id                TEXT        REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id     TEXT,
  stripe_event_id        TEXT        UNIQUE,   -- Stripe evt_… used for dedup
  event_type             TEXT        NOT NULL, -- e.g. invoice.payment_succeeded
  amount_cents           INTEGER,              -- positive=charge, negative=refund
  currency               TEXT        NOT NULL DEFAULT 'usd',
  description            TEXT,
  stripe_payment_intent  TEXT,
  stripe_invoice_id      TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT        NOT NULL DEFAULT 'pending',
  metadata               JSONB       NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pal_user_id_idx ON payment_audit_log (user_id, created_at DESC);

-- Refunds ledger ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id                    TEXT        PRIMARY KEY,
  user_id               TEXT        REFERENCES users(id)         ON DELETE SET NULL,
  order_id              TEXT        REFERENCES orders(id)        ON DELETE SET NULL,
  subscription_id       TEXT        REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_refund_id      TEXT        UNIQUE,          -- re_…
  stripe_payment_intent TEXT,
  amount_cents          INTEGER     NOT NULL,
  currency              TEXT        NOT NULL DEFAULT 'usd',
  reason                TEXT,                        -- duplicate, fraudulent, requested_by_customer …
  status                TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','succeeded','failed','canceled')),
  notes                 TEXT,
  requested_by          TEXT        REFERENCES users(id) ON DELETE SET NULL,
  processed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refunds_user_id_idx ON refunds (user_id, created_at DESC);

-- Account actions log ─────────────────────────────────────────────────────────
-- Records every suspension, ban, trial revocation, and manual override.
CREATE TABLE IF NOT EXISTS account_actions (
  id           TEXT        PRIMARY KEY,
  user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type  TEXT        NOT NULL
    CHECK (action_type IN (
      'suspended','unsuspended',
      'banned','unbanned',
      'subscription_canceled','subscription_paused','subscription_resumed',
      'payment_failed_lock','payment_failed_resolved',
      'trial_revoked','manual_override'
    )),
  reason       TEXT,
  performed_by TEXT        REFERENCES users(id) ON DELETE SET NULL,  -- NULL = system
  expires_at   TIMESTAMPTZ,                                           -- NULL = permanent
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_actions_user_idx ON account_actions (user_id, created_at DESC);

-- Seed admin (optional if not present)
INSERT INTO users (id, email, name, password_hash, role)
VALUES ('admin_seed', 'admin@tipzy.app', 'Tipzy Admin', '__PENDING__', 'admin')
ON CONFLICT (email) DO NOTHING;
