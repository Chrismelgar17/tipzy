/**
 * Payment Service – Phase 4
 *
 * Thin wrappers around the /api/stripe/* backend endpoints.
 * All methods return the raw JSON body from the server.
 *
 * Flow for adding a card:
 *   1. createSetupIntent() → get clientSecret
 *   2. Initialise + present Stripe PaymentSheet with clientSecret
 *   3. On success call syncPaymentMethods() to pull the new card into our DB
 */
import api from './api';
import type { PaymentMethod, Subscription } from '@/types/models';

// ─── Card / Payment-method management ─────────────────────────────────────────

/** Step 1 of card collection — backend creates a SetupIntent. */
export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  const res = await api.post('/stripe/setup-intent');
  return res.data;
}

/**
 * Step 3 — after PaymentSheet confirms, sync all attached cards from Stripe
 * to our local DB. Returns the updated card list.
 */
export async function syncPaymentMethods(): Promise<{ methods: PaymentMethod[] }> {
  const res = await api.post('/stripe/sync-methods');
  return res.data;
}

/** List all saved payment methods for the authenticated user. */
export async function listPaymentMethods(): Promise<{ methods: PaymentMethod[] }> {
  const res = await api.get('/stripe/methods');
  return res.data;
}

/** Detach and remove a saved card by its local DB id. */
export async function removePaymentMethod(id: string): Promise<{ success: boolean }> {
  const res = await api.delete(`/stripe/methods/${id}`);
  return res.data;
}

/** Set a card as the default payment method. */
export async function setDefaultPaymentMethod(id: string): Promise<{ success: boolean }> {
  const res = await api.post('/stripe/default-method', { paymentMethodId: id });
  return res.data;
}

// ─── Subscription lifecycle ────────────────────────────────────────────────────

/**
 * Start a free trial.
 * Requires at least one saved payment method.
 * Throws `{ code: 'no_payment_method' }` when none is on file.
 */
export async function startTrial(
  plan: 'customer' | 'business',
): Promise<{
  subscriptionId: string;
  status: string;
  plan: string;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  trialDays: number;
}> {
  const res = await api.post('/stripe/start-trial', { plan });
  return res.data;
}

/** Fetch the current subscription. Returns `{ subscription: null }` when none exists. */
export async function getSubscription(): Promise<{ subscription: Subscription | null }> {
  const res = await api.get('/stripe/subscription');
  return res.data;
}

/**
 * Cancel at period end — access remains until the current period expires.
 * Returns `{ accessUntil: ISO string }`.
 */
export async function cancelSubscription(): Promise<{
  success: boolean;
  cancelAtPeriodEnd: boolean;
  accessUntil: string | null;
}> {
  const res = await api.post('/stripe/cancel');
  return res.data;
}

/** Undo a pending cancellation — subscription renews as normal. */
export async function reactivateSubscription(): Promise<{ success: boolean }> {
  const res = await api.post('/stripe/reactivate');
  return res.data;
}
