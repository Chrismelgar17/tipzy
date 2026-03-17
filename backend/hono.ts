import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import customerRoutes from "./routes/customer";
import businessRoutes from "./routes/business";
import adminRoutes from "./routes/admin";
import venueRoutes from "./routes/venues";
import stripeRoutes from "./routes/stripe";
import { query } from "./db";

const app = new Hono().basePath("/api");

// ── Auto-migrate Phase 4 tables on startup ────────────────────────────────────
(async () => {
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT`);
    await query(`
      CREATE TABLE IF NOT EXISTS user_payment_methods (
        id                       TEXT PRIMARY KEY,
        user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_method_id TEXT NOT NULL UNIQUE,
        card_brand               TEXT,
        card_last4               TEXT,
        card_exp_month           INTEGER,
        card_exp_year            INTEGER,
        is_default               BOOLEAN NOT NULL DEFAULT false,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS upm_user_id_idx ON user_payment_methods (user_id)`);
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                       TEXT PRIMARY KEY,
        user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id       TEXT,
        stripe_subscription_id   TEXT UNIQUE,
        stripe_payment_method_id TEXT,
        plan                     TEXT NOT NULL,
        status                   TEXT NOT NULL DEFAULT 'trialing',
        trial_start              TIMESTAMPTZ,
        trial_end                TIMESTAMPTZ,
        current_period_start     TIMESTAMPTZ,
        current_period_end       TIMESTAMPTZ,
        cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
        canceled_at              TIMESTAMPTZ,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique ON subscriptions (user_id)`);
    await query(`
      CREATE TABLE IF NOT EXISTS payment_audit_log (
        id                     TEXT        PRIMARY KEY,
        user_id                TEXT        REFERENCES users(id) ON DELETE SET NULL,
        stripe_customer_id     TEXT,
        stripe_event_id        TEXT        UNIQUE,
        event_type             TEXT        NOT NULL,
        amount_cents           INTEGER,
        currency               TEXT        NOT NULL DEFAULT 'usd',
        description            TEXT,
        stripe_payment_intent  TEXT,
        stripe_invoice_id      TEXT,
        stripe_subscription_id TEXT,
        status                 TEXT        NOT NULL DEFAULT 'pending',
        metadata               JSONB       NOT NULL DEFAULT '{}',
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS account_actions (
        id           TEXT        PRIMARY KEY,
        user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type  TEXT        NOT NULL,
        reason       TEXT,
        performed_by TEXT        REFERENCES users(id) ON DELETE SET NULL,
        expires_at   TIMESTAMPTZ,
        metadata     JSONB       NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log("[startup] Phase 4 tables verified ✓");
  } catch (err: any) {
    console.error("[startup] Auto-migration warning:", err?.message);
  }
})();

app.use("*", cors({
  origin: (origin) => origin ?? "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  credentials: true,
}));

// Auth routes
app.route("/customer", customerRoutes);
app.route("/business", businessRoutes);
app.route("/admin", adminRoutes);
app.route("/venues", venueRoutes);

// Stripe Payment Engine (Phase 4)
app.route("/stripe", stripeRoutes);

// tRPC
app.use("/trpc/*", trpcServer({ endpoint: "/api/trpc", router: appRouter, createContext }));

// Health check
app.get("/", (c) => c.json({ status: "ok", message: "Tipzy API is running", version: "2.0" }));

export default app;
