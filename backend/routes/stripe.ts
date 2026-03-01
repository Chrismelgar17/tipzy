/**
 * Stripe Payment Engine – Phase 4
 *
 * All routes live under /api/stripe  (registered in hono.ts)
 *
 * Card / Payment-method management:
 *   POST   /setup-intent        → Create SetupIntent (returns clientSecret)
 *   POST   /sync-methods        → After PaymentSheet confirms, sync PMs from Stripe to DB
 *   GET    /methods             → List user's saved payment methods
 *   DELETE /methods/:pmId       → Detach a payment method
 *   POST   /default-method      → Set default payment method
 *
 * Subscription lifecycle:
 *   POST   /start-trial         → Start free trial (card required on file)
 *   GET    /subscription        → Get current subscription status
 *   POST   /cancel              → Cancel at period end
 *   POST   /reactivate          → Undo scheduled cancellation
 *
 * Stripe webhooks:
 *   POST   /webhook             → Raw body — Stripe-Signature verified
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY           – sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET       – whsec_… (from Stripe dashboard)
 *   STRIPE_CUSTOMER_PRICE_ID    – price_… for customer monthly plan
 *   STRIPE_BUSINESS_PRICE_ID    – price_… for business monthly plan
 */
import { Hono } from "hono";
import Stripe from "stripe";
import { requireAuth } from "../auth";
import { query } from "../db";
import type { DbSubscription, DbUserPaymentMethod } from "../db";

// ─── Lazy Stripe client ───────────────────────────────────────────────────────
// Instantiated on first use so the server starts even when STRIPE_SECRET_KEY
// is not yet configured in the environment (avoids crash-on-boot on Railway).
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY ?? "";
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your Railway environment variables.",
      );
    }
    _stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" as any });
  }
  return _stripe;
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Trial durations per full plan key
const TRIAL_DAYS: Record<string, number> = {
  customer_monthly: 7,   // Tipzy Plus
  customer_pro:     7,   // Tipzy Pro
  business_monthly: 30,  // Business Starter
  business_pro:     90,  // Business Pro
};

// Price IDs — configure each in Railway env vars
const PRICE_IDS: Record<string, string> = {
  customer_monthly: process.env.STRIPE_CUSTOMER_MONTHLY_PRICE_ID ?? process.env.STRIPE_CUSTOMER_PRICE_ID ?? "",
  customer_pro:     process.env.STRIPE_CUSTOMER_PRO_PRICE_ID     ?? "",
  business_monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? process.env.STRIPE_BUSINESS_PRICE_ID ?? "",
  business_pro:     process.env.STRIPE_BUSINESS_PRO_PRICE_ID     ?? "",
};

// All valid plan keys
const VALID_PLANS = Object.keys(PRICE_IDS);

// Backward-compat: legacy short keys from old clients / frontend
const PLAN_KEY_MAP: Record<string, string> = {
  customer: "customer_monthly",
  business: "business_monthly",
};

const stripeRouter = new Hono();

// ─── Helper: get or create Stripe Customer ────────────────────────────────────
async function ensureStripeCustomer(userId: string): Promise<string> {
  const res = await query<{ stripe_customer_id: string | null; email: string; name: string }>(
    "SELECT stripe_customer_id, email, name FROM users WHERE id = $1",
    [userId],
  );
  const user = res.rows[0];
  if (!user) throw new Error("User not found");
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { tipzyUserId: userId },
  });

  await query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customer.id, userId]);
  return customer.id;
}

// ─── Helper: upsert a PaymentMethod row ───────────────────────────────────────
async function upsertPaymentMethod(
  userId: string,
  pm: Stripe.PaymentMethod,
  isDefault: boolean,
): Promise<void> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO user_payment_methods
       (id, user_id, stripe_payment_method_id, card_brand, card_last4,
        card_exp_month, card_exp_year, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (stripe_payment_method_id)
       DO UPDATE SET
         card_brand     = EXCLUDED.card_brand,
         card_last4     = EXCLUDED.card_last4,
         card_exp_month = EXCLUDED.card_exp_month,
         card_exp_year  = EXCLUDED.card_exp_year,
         is_default     = EXCLUDED.is_default`,
    [
      id, userId, pm.id,
      pm.card?.brand ?? null,
      pm.card?.last4 ?? null,
      pm.card?.exp_month ?? null,
      pm.card?.exp_year ?? null,
      isDefault,
    ],
  );
}

// ─── Helper: write to payment_audit_log ──────────────────────────────────────
async function writeAuditLog(params: {
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeEventId?: string | null;
  eventType: string;
  amountCents?: number | null;
  currency?: string;
  description?: string | null;
  stripePaymentIntent?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO payment_audit_log
         (id, user_id, stripe_customer_id, stripe_event_id, event_type,
          amount_cents, currency, description, stripe_payment_intent,
          stripe_invoice_id, stripe_subscription_id, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [
        crypto.randomUUID(),
        params.userId ?? null,
        params.stripeCustomerId ?? null,
        params.stripeEventId ?? null,
        params.eventType,
        params.amountCents ?? null,
        params.currency ?? "usd",
        params.description ?? null,
        params.stripePaymentIntent ?? null,
        params.stripeInvoiceId ?? null,
        params.stripeSubscriptionId ?? null,
        params.status ?? "pending",
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  } catch (err: any) {
    console.error("[audit-log] Failed to write entry:", err?.message);
  }
}

// ─── Helper: write account action ─────────────────────────────────────────────
async function writeAccountAction(params: {
  userId: string;
  actionType: string;
  reason?: string | null;
  performedBy?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO account_actions (id, user_id, action_type, reason, performed_by, expires_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        crypto.randomUUID(),
        params.userId,
        params.actionType,
        params.reason ?? null,
        params.performedBy ?? null,
        params.expiresAt ?? null,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  } catch (err: any) {
    console.error("[account-action] Failed to write entry:", err?.message);
  }
}

// ─── POST /setup-intent ───────────────────────────────────────────────────────
// Creates a Stripe SetupIntent bound to the user's customer object.
// The client uses clientSecret with @stripe/stripe-react-native PaymentSheet
// to securely collect and tokenize card / Apple Pay / Google Pay details.
stripeRouter.post("/setup-intent", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  try {
    const customerId = await ensureStripeCustomer(userId);
    const intent = await getStripe().setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });
    return c.json({ clientSecret: intent.client_secret });
  } catch (err: any) {
    console.error("[stripe/setup-intent]", err?.message);
    return c.json({ error: err?.message ?? "Failed to create setup intent" }, 500);
  }
});

// ─── POST /sync-methods ───────────────────────────────────────────────────────
// Call this after PaymentSheet confirms the SetupIntent.
// Fetches all PMs attached to the Stripe customer and upserts them in our DB.
stripeRouter.post("/sync-methods", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  try {
    const customerId = await ensureStripeCustomer(userId);
    const pmList = await getStripe().paymentMethods.list({ customer: customerId, type: "card" });
    const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer;
    const defaultPmId = (customer.invoice_settings?.default_payment_method as string) ?? null;

    // If no default is set on Stripe but we have PMs, set the first as default
    if (!defaultPmId && pmList.data.length > 0) {
      await getStripe().customers.update(customerId, {
        invoice_settings: { default_payment_method: pmList.data[0].id },
      });
    }

    // Clear is_default on all existing rows for this user, then re-set below
    await query("UPDATE user_payment_methods SET is_default = false WHERE user_id = $1", [userId]);

    for (const pm of pmList.data) {
      const isDefault = pm.id === defaultPmId || (!defaultPmId && pm.id === pmList.data[0]?.id);
      await upsertPaymentMethod(userId, pm, isDefault);
    }

    // Return updated list
    const saved = await query<DbUserPaymentMethod>(
      "SELECT * FROM user_payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC",
      [userId],
    );
    return c.json({ methods: saved.rows.map(mapMethod) });
  } catch (err: any) {
    console.error("[stripe/sync-methods]", err?.message);
    return c.json({ error: err?.message ?? "Failed to sync payment methods" }, 500);
  }
});

// ─── GET /methods ─────────────────────────────────────────────────────────────
stripeRouter.get("/methods", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  try {
    const res = await query<DbUserPaymentMethod>(
      "SELECT * FROM user_payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC",
      [userId],
    );
    return c.json({ methods: res.rows.map(mapMethod) });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "Failed to list payment methods" }, 500);
  }
});

// ─── DELETE /methods/:pmId ────────────────────────────────────────────────────
stripeRouter.delete("/methods/:pmId", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  const pmId   = c.req.param("pmId");

  try {
    const res = await query<{ stripe_payment_method_id: string; is_default: boolean }>(
      "SELECT stripe_payment_method_id, is_default FROM user_payment_methods WHERE id = $1 AND user_id = $2",
      [pmId, userId],
    );
    if (res.rows.length === 0) return c.json({ error: "Payment method not found" }, 404);

    const { stripe_payment_method_id, is_default } = res.rows[0];

    // Detach from Stripe
    await getStripe().paymentMethods.detach(stripe_payment_method_id);

    // Remove from DB
    await query("DELETE FROM user_payment_methods WHERE id = $1", [pmId]);

    // Promote the next method as default if the deleted one was default
    if (is_default) {
      const next = await query<{ id: string; stripe_payment_method_id: string }>(
        "SELECT id, stripe_payment_method_id FROM user_payment_methods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [userId],
      );
      if (next.rows.length > 0) {
        await query("UPDATE user_payment_methods SET is_default = true WHERE id = $1", [next.rows[0].id]);
        const customerId = await ensureStripeCustomer(userId);
        await getStripe().customers.update(customerId, {
          invoice_settings: { default_payment_method: next.rows[0].stripe_payment_method_id },
        });
      }
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.error("[stripe/delete-method]", err?.message);
    return c.json({ error: err?.message ?? "Failed to remove payment method" }, 500);
  }
});

// ─── POST /default-method ─────────────────────────────────────────────────────
stripeRouter.post("/default-method", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  let body: { paymentMethodId?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const { paymentMethodId } = body;
  if (!paymentMethodId) return c.json({ error: "paymentMethodId required" }, 400);

  try {
    const res = await query<{ stripe_payment_method_id: string }>(
      "SELECT stripe_payment_method_id FROM user_payment_methods WHERE id = $1 AND user_id = $2",
      [paymentMethodId, userId],
    );
    if (res.rows.length === 0) return c.json({ error: "Payment method not found" }, 404);

    await query("UPDATE user_payment_methods SET is_default = false WHERE user_id = $1", [userId]);
    await query("UPDATE user_payment_methods SET is_default = true  WHERE id = $1",      [paymentMethodId]);

    const customerId = await ensureStripeCustomer(userId);
    await getStripe().customers.update(customerId, {
      invoice_settings: { default_payment_method: res.rows[0].stripe_payment_method_id },
    });

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "Failed to set default" }, 500);
  }
});

// ─── POST /start-trial ────────────────────────────────────────────────────────
// Requires a saved payment method.
// Creates a Stripe Subscription with trial_period_days (7 for customers, 90 for business).
// Stripe will automatically convert to paid at trial end.
stripeRouter.post("/start-trial", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  let body: { plan?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const rawPlan = body.plan ?? "";
  // Backward-compat: 'customer' → 'customer_monthly', 'business' → 'business_monthly'
  const plan = PLAN_KEY_MAP[rawPlan] ?? rawPlan;

  if (!plan || !VALID_PLANS.includes(plan)) {
    return c.json(
      { error: `Invalid plan. Valid plans: ${VALID_PLANS.join(", ")}` },
      400,
    );
  }

  try {
    // ── 1. Card required check ────────────────────────────────────────────────
    const pmCount = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM user_payment_methods WHERE user_id = $1",
      [userId],
    );
    if (parseInt(pmCount.rows[0].count, 10) === 0) {
      return c.json(
        { error: "A payment method is required before starting a trial", code: "no_payment_method" },
        402,
      );
    }

    // ── 2. No duplicate active subscription ───────────────────────────────────
    const existing = await query<{ id: string; status: string }>(
      "SELECT id, status FROM subscriptions WHERE user_id = $1 AND status NOT IN ('canceled','incomplete_expired') LIMIT 1",
      [userId],
    );
    if (existing.rows.length > 0) {
      return c.json(
        { error: "An active subscription already exists", code: "already_subscribed" },
        409,
      );
    }

    // ── 3. Validate price configured ─────────────────────────────────────────
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      console.error(`[stripe/start-trial] Missing env var for plan "${plan}"`);
      return c.json(
        { error: `Stripe price for "${plan}" plan is not configured on the server.` },
        500,
      );
    }

    // ── 4. Create Stripe subscription with trial ──────────────────────────────
    const customerId = await ensureStripeCustomer(userId);
    const defaultPm  = await query<{ stripe_payment_method_id: string }>(
      "SELECT stripe_payment_method_id FROM user_payment_methods WHERE user_id = $1 AND is_default = true LIMIT 1",
      [userId],
    );

    const subscription = await getStripe().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: TRIAL_DAYS[plan],
      default_payment_method: defaultPm.rows[0]?.stripe_payment_method_id,
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" },
      },
    });

    // ── 5. Persist to DB ──────────────────────────────────────────────────────
    const trialEnd    = subscription.trial_end    ? new Date(subscription.trial_end    * 1000) : null;
    const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null;
    const periodEnd   = subscription.current_period_end   ? new Date(subscription.current_period_end   * 1000) : null;
    const trialStart  = subscription.trial_start  ? new Date(subscription.trial_start  * 1000) : null;

    await query(
      `INSERT INTO subscriptions
         (id, user_id, stripe_customer_id, stripe_subscription_id, stripe_payment_method_id,
          plan, status, trial_start, trial_end, current_period_start, current_period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_subscription_id   = EXCLUDED.stripe_subscription_id,
         plan                     = EXCLUDED.plan,
         status                   = EXCLUDED.status,
         trial_start              = EXCLUDED.trial_start,
         trial_end                = EXCLUDED.trial_end,
         current_period_start     = EXCLUDED.current_period_start,
         current_period_end       = EXCLUDED.current_period_end,
         updated_at               = now()`,
      [
        crypto.randomUUID(),
        userId,
        customerId,
        subscription.id,
        defaultPm.rows[0]?.stripe_payment_method_id ?? null,
        plan,   // full plan key: 'customer_monthly', 'customer_pro', 'business_monthly', 'business_pro'
        subscription.status,
        trialStart,
        trialEnd,
        periodStart,
        periodEnd,
      ],
    );

    // ── 6. Write audit entry ──────────────────────────────────────────────
    await writeAuditLog({
      userId,
      stripeCustomerId: customerId,
      stripeEventId: `trial_start_${subscription.id}`,
      eventType: "subscription.trial_started",
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      description: `Trial started: ${plan} (${TRIAL_DAYS[plan]} days)`,
      metadata: { plan, trialDays: TRIAL_DAYS[plan] },
    });

    return c.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      plan,
      trialEnd: trialEnd?.toISOString() ?? null,
      currentPeriodEnd: periodEnd?.toISOString() ?? null,
      trialDays: TRIAL_DAYS[plan],
    });
  } catch (err: any) {
    console.error("[stripe/start-trial]", err?.message);
    return c.json({ error: err?.message ?? "Failed to start trial" }, 500);
  }
});

// ─── GET /subscription ────────────────────────────────────────────────────────
stripeRouter.get("/subscription", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  try {
    const res = await query<DbSubscription>(
      "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId],
    );
    if (res.rows.length === 0) return c.json({ subscription: null });

    const s = res.rows[0];
    return c.json({
      subscription: {
        id:                   s.id,
        stripeSubscriptionId: s.stripe_subscription_id,
        plan:                 s.plan,
        status:               s.status,
        trialStart:           s.trial_start,
        trialEnd:             s.trial_end,
        currentPeriodStart:   s.current_period_start,
        currentPeriodEnd:     s.current_period_end,
        cancelAtPeriodEnd:    s.cancel_at_period_end,
        canceledAt:           s.canceled_at,
        createdAt:            s.created_at,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "Failed to get subscription" }, 500);
  }
});

// ─── POST /cancel ─────────────────────────────────────────────────────────────
// Sets cancel_at_period_end = true — user keeps access until period ends.
stripeRouter.post("/cancel", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  try {
    const res = await query<{ stripe_subscription_id: string }>(
      "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status NOT IN ('canceled','incomplete_expired') LIMIT 1",
      [userId],
    );
    if (res.rows.length === 0) return c.json({ error: "No active subscription found" }, 404);
    if (!res.rows[0].stripe_subscription_id) return c.json({ error: "No linked Stripe subscription" }, 404);

    const updated = await getStripe().subscriptions.update(res.rows[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await query(
      "UPDATE subscriptions SET cancel_at_period_end = true, updated_at = now() WHERE user_id = $1",
      [userId],
    );

    return c.json({
      success: true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      accessUntil: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err: any) {
    console.error("[stripe/cancel]", err?.message);
    return c.json({ error: err?.message ?? "Failed to cancel subscription" }, 500);
  }
});

// ─── POST /reactivate ─────────────────────────────────────────────────────────
// Removes a pending cancellation — user stays subscribed past period end.
stripeRouter.post("/reactivate", requireAuth, async (c) => {
  const userId = (c as any).get("userId") as string;
  try {
    const res = await query<{ stripe_subscription_id: string }>(
      "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND cancel_at_period_end = true LIMIT 1",
      [userId],
    );
    if (res.rows.length === 0) return c.json({ error: "No pending cancellation found" }, 404);

    await getStripe().subscriptions.update(res.rows[0].stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await query(
      "UPDATE subscriptions SET cancel_at_period_end = false, updated_at = now() WHERE user_id = $1",
      [userId],
    );

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "Failed to reactivate" }, 500);
  }
});

// ─── POST /webhook ────────────────────────────────────────────────────────────
// Stripe sends signed POST requests here.
// IMPORTANT: verify the raw body — never parse JSON first.
stripeRouter.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "Missing stripe-signature header" }, 400);

  let event: Stripe.Event;
  const rawBody = await c.req.text();

  try {
    if (WEBHOOK_SECRET) {
      event = getStripe().webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
    } else {
      // Dev-only: skip verification if secret not set
      console.warn("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature check");
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err?.message);
    return c.json({ error: "Invalid Stripe signature" }, 400);
  }

  console.log(`[stripe/webhook] ▸ ${event.type}`);

  try {
    switch (event.type) {
      // ── Subscription state changes ─────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await query(
          `UPDATE subscriptions SET
             status               = $1,
             trial_end            = $2,
             current_period_start = $3,
             current_period_end   = $4,
             cancel_at_period_end = $5,
             updated_at           = now()
           WHERE stripe_subscription_id = $6`,
          [
            sub.status,
            sub.trial_end            ? new Date(sub.trial_end            * 1000) : null,
            sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
            sub.current_period_end   ? new Date(sub.current_period_end   * 1000) : null,
            sub.cancel_at_period_end,
            sub.id,
          ],
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const subRow = (await query<{ user_id: string }>(
          "SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1",
          [sub.id],
        )).rows[0];
        await query(
          `UPDATE subscriptions SET
             status     = 'canceled',
             canceled_at = now(),
             updated_at  = now()
           WHERE stripe_subscription_id = $1`,
          [sub.id],
        );
        await writeAuditLog({
          userId: subRow?.user_id ?? null,
          stripeCustomerId: sub.customer as string,
          stripeEventId: event.id,
          eventType: event.type,
          stripeSubscriptionId: sub.id,
          status: "canceled",
          description: `Subscription canceled: ${sub.id}`,
        });
        if (subRow?.user_id) {
          await writeAccountAction({
            userId: subRow.user_id,
            actionType: "subscription_canceled",
            reason: "Subscription deleted by Stripe webhook",
            metadata: { stripeSubscriptionId: sub.id },
          });
        }
        break;
      }

      // ── Invoice / payment events ───────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = (inv as any).subscription as string | null;
        if (subId) {
          await query(
            "UPDATE subscriptions SET status = 'active', updated_at = now() WHERE stripe_subscription_id = $1",
            [subId],
          );
        }
        const subRowS = subId
          ? (await query<{ user_id: string; stripe_customer_id: string }>(
              "SELECT user_id, stripe_customer_id FROM subscriptions WHERE stripe_subscription_id = $1",
              [subId],
            )).rows[0]
          : null;
        await writeAuditLog({
          userId: subRowS?.user_id ?? null,
          stripeCustomerId: (inv.customer as string) ?? subRowS?.stripe_customer_id ?? null,
          stripeEventId: event.id,
          eventType: event.type,
          amountCents: inv.amount_paid,
          currency: inv.currency,
          stripeInvoiceId: inv.id,
          stripeSubscriptionId: subId,
          status: "succeeded",
          description: `Invoice paid: ${inv.id}`,
        });
        // Resolve any previous payment-failed lock
        if (subRowS?.user_id) {
          await writeAccountAction({
            userId: subRowS.user_id,
            actionType: "payment_failed_resolved",
            reason: `Invoice ${inv.id} payment succeeded`,
            metadata: { stripeInvoiceId: inv.id },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = (inv as any).subscription as string | null;
        if (subId) {
          await query(
            "UPDATE subscriptions SET status = 'past_due', updated_at = now() WHERE stripe_subscription_id = $1",
            [subId],
          );
        }
        const subRowF = subId
          ? (await query<{ user_id: string; stripe_customer_id: string }>(
              "SELECT user_id, stripe_customer_id FROM subscriptions WHERE stripe_subscription_id = $1",
              [subId],
            )).rows[0]
          : null;
        await writeAuditLog({
          userId: subRowF?.user_id ?? null,
          stripeCustomerId: (inv.customer as string) ?? subRowF?.stripe_customer_id ?? null,
          stripeEventId: event.id,
          eventType: event.type,
          amountCents: inv.amount_due,
          currency: inv.currency,
          stripeInvoiceId: inv.id,
          stripeSubscriptionId: subId,
          status: "failed",
          description: `Invoice payment failed: ${inv.id}`,
        });
        if (subRowF?.user_id) {
          await writeAccountAction({
            userId: subRowF.user_id,
            actionType: "payment_failed_lock",
            reason: `Invoice ${inv.id} payment failed`,
            metadata: { stripeInvoiceId: inv.id, stripeSubscriptionId: subId },
          });
        }
        break;
      }

      // Optionally handle trial_will_end to send reminder emails
      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[stripe/webhook] Trial ending soon for subscription ${sub.id}`);
        // TODO: send reminder email via sendTrialEndingEmail()
        break;
      }

      default:
        // Unhandled event — no action needed
        break;
    }
  } catch (dbErr: any) {
    console.error("[stripe/webhook] DB update error:", dbErr?.message);
    // Return 200 so Stripe doesn't retry — log and alert via monitoring instead
  }

  return c.json({ received: true });
});

// ─── GET /audit-log ───────────────────────────────────────────────────────────
// Returns the payment audit ledger for the authenticated user (last 100 rows).
// Admins can pass ?userId=xxx to view another user's ledger.
stripeRouter.get("/audit-log", requireAuth, async (c) => {
  const requesterId = (c as any).get("userId") as string;
  const targetUserId = c.req.query("userId") ?? requesterId;

  // Only allow viewing other users' logs if admin
  if (targetUserId !== requesterId) {
    const requester = await query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1",
      [requesterId],
    );
    if (requester.rows[0]?.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }
  }

  try {
    const res = await query(
      `SELECT id, event_type, amount_cents, currency, description,
              stripe_invoice_id, stripe_subscription_id, status, metadata, created_at
       FROM payment_audit_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [targetUserId],
    );
    return c.json({ entries: res.rows });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "Failed to fetch audit log" }, 500);
  }
});

// ─── POST /refund ─────────────────────────────────────────────────────────────
// Issues a Stripe refund and records it in the refunds table.
// Body: { paymentIntentId, amountCents?, reason?, notes?, orderId?, subscriptionId? }
// Requires admin role or the user who owns the payment.
stripeRouter.post("/refund", requireAuth, async (c) => {
  const requesterId = (c as any).get("userId") as string;

  let body: {
    paymentIntentId: string;
    amountCents?: number;
    reason?: string;
    notes?: string;
    orderId?: string;
    subscriptionId?: string;
    targetUserId?: string;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const { paymentIntentId, amountCents, reason, notes, orderId, subscriptionId, targetUserId } = body;
  if (!paymentIntentId) return c.json({ error: "paymentIntentId is required" }, 400);

  // Admin-only or self
  const requester = await query<{ role: string }>("SELECT role FROM users WHERE id = $1", [requesterId]);
  const isAdmin = requester.rows[0]?.role === "admin";
  const userId = targetUserId ?? requesterId;
  if (userId !== requesterId && !isAdmin) return c.json({ error: "Forbidden" }, 403);

  try {
    // Retrieve the PaymentIntent to get charge ID
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
    const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge as any)?.id;
    if (!chargeId) return c.json({ error: "No charge found on this PaymentIntent" }, 400);

    const refundParams: Stripe.RefundCreateParams = { charge: chargeId };
    if (amountCents) refundParams.amount = amountCents;
    if (reason && ["duplicate", "fraudulent", "requested_by_customer"].includes(reason)) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const stripeRefund = await getStripe().refunds.create(refundParams);

    // Persist to refunds table
    const refundId = crypto.randomUUID();
    await query(
      `INSERT INTO refunds
         (id, user_id, order_id, subscription_id, stripe_refund_id, stripe_payment_intent,
          amount_cents, currency, reason, status, notes, requested_by, processed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        refundId,
        userId,
        orderId ?? null,
        subscriptionId ?? null,
        stripeRefund.id,
        paymentIntentId,
        stripeRefund.amount,
        stripeRefund.currency,
        reason ?? null,
        stripeRefund.status ?? "pending",
        notes ?? null,
        requesterId,
        stripeRefund.status === "succeeded" ? new Date() : null,
      ],
    );

    // Audit entry
    await writeAuditLog({
      userId,
      stripeEventId: `refund_${stripeRefund.id}`,
      eventType: "refund.created",
      amountCents: -(stripeRefund.amount),
      currency: stripeRefund.currency,
      stripePaymentIntent: paymentIntentId,
      status: stripeRefund.status ?? "pending",
      description: `Refund issued: ${stripeRefund.id}`,
      metadata: { reason, notes, stripeRefundId: stripeRefund.id },
    });

    return c.json({
      success: true,
      refundId,
      stripeRefundId: stripeRefund.id,
      amountCents: stripeRefund.amount,
      status: stripeRefund.status,
    });
  } catch (err: any) {
    console.error("[stripe/refund]", err?.message);
    return c.json({ error: err?.message ?? "Failed to issue refund" }, 500);
  }
});

// ─── POST /account-action ─────────────────────────────────────────────────────
// Admin-only: record a suspension, ban, trial revocation, or manual override.
stripeRouter.post("/account-action", requireAuth, async (c) => {
  const requesterId = (c as any).get("userId") as string;

  const requester = await query<{ role: string }>("SELECT role FROM users WHERE id = $1", [requesterId]);
  if (requester.rows[0]?.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  let body: {
    userId: string;
    actionType: string;
    reason?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const ALLOWED_ACTIONS = [
    "suspended", "unsuspended", "banned", "unbanned",
    "subscription_canceled", "subscription_paused", "subscription_resumed",
    "payment_failed_lock", "payment_failed_resolved",
    "trial_revoked", "manual_override",
  ];

  if (!body.userId) return c.json({ error: "userId is required" }, 400);
  if (!ALLOWED_ACTIONS.includes(body.actionType)) {
    return c.json({ error: `actionType must be one of: ${ALLOWED_ACTIONS.join(", ")}` }, 400);
  }

  try {
    // Apply suspension to users table when relevant
    if (body.actionType === "suspended") {
      await query(
        "UPDATE users SET is_suspended = true, suspension_reason = $1, suspended_until = $2 WHERE id = $3",
        [body.reason ?? null, body.expiresAt ? new Date(body.expiresAt) : null, body.userId],
      );
    } else if (body.actionType === "unsuspended") {
      await query(
        "UPDATE users SET is_suspended = false, suspension_reason = NULL, suspended_until = NULL WHERE id = $1",
        [body.userId],
      );
    }

    // Cancel Stripe subscription if action requires it
    if (["trial_revoked", "subscription_canceled", "banned"].includes(body.actionType)) {
      const sub = await query<{ stripe_subscription_id: string }>(
        "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status NOT IN ('canceled','incomplete_expired') LIMIT 1",
        [body.userId],
      );
      if (sub.rows[0]?.stripe_subscription_id) {
        await getStripe().subscriptions.cancel(sub.rows[0].stripe_subscription_id);
        await query(
          "UPDATE subscriptions SET status = 'canceled', canceled_at = now(), updated_at = now() WHERE user_id = $1",
          [body.userId],
        );
      }
    }

    await writeAccountAction({
      userId: body.userId,
      actionType: body.actionType,
      reason: body.reason ?? null,
      performedBy: requesterId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      metadata: body.metadata ?? {},
    });

    return c.json({ success: true });
  } catch (err: any) {
    console.error("[stripe/account-action]", err?.message);
    return c.json({ error: err?.message ?? "Failed to apply account action" }, 500);
  }
});

// ─── Row mapper ───────────────────────────────────────────────────────────────
function mapMethod(r: DbUserPaymentMethod) {
  return {
    id:                    r.id,
    stripePaymentMethodId: r.stripe_payment_method_id,
    brand:                 r.card_brand,
    last4:                 r.card_last4,
    expMonth:              r.card_exp_month,
    expYear:               r.card_exp_year,
    isDefault:             r.is_default,
    createdAt:             r.created_at,
  };
}

export default stripeRouter;
