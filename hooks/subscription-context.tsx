/**
 * Subscription Context – Phase 4
 *
 * Loads the user's subscription once on auth, exposes reactive helpers,
 * and provides actions for starting a trial, cancelling, and reactivating.
 *
 * Usage:
 *   const { subscription, isTrialing, daysLeftInTrial, startTrial } = useSubscription();
 */
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import type { Subscription } from '@/types/models';
import * as paymentService from '@/lib/payment.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface SubscriptionState {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;

  // Convenience booleans
  isTrialing: boolean;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  /** True when trial OR paid subscription is active */
  hasAccess: boolean;
  /** True when cancel_at_period_end is set */
  pendingCancellation: boolean;

  // Trial helpers
  daysLeftInTrial: number;
  trialPlan: 'customer' | 'business' | null;

  // Actions
  refresh: () => Promise<void>;
  startTrial: (plan: 'customer' | 'business') => Promise<void>;
  cancel: () => Promise<void>;
  reactivate: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const [SubscriptionProvider, useSubscription] = createContextHook(
  (): SubscriptionState => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Derived booleans ────────────────────────────────────────────────────
    const isTrialing          = subscription?.status === 'trialing';
    const isActive            = subscription?.status === 'active';
    const isPastDue           = subscription?.status === 'past_due';
    const isCanceled          = subscription?.status === 'canceled';
    const hasAccess           = isTrialing || isActive;
    const pendingCancellation = subscription?.cancelAtPeriodEnd === true;
    const daysLeftInTrial     = isTrialing ? daysUntil(subscription?.trialEnd) : 0;
    const trialPlan: 'customer' | 'business' | null = subscription?.plan
      ? (subscription.plan.startsWith('business') ? 'business' : 'customer')
      : null;

    // ── Load subscription from backend ──────────────────────────────────────
    const refresh = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { subscription: sub } = await paymentService.getSubscription();
        setSubscription(sub);
      } catch (err: any) {
        // 401 = not logged in yet; don't show an error
        if (err?.response?.status !== 401) {
          setError(err?.response?.data?.error ?? 'Failed to load subscription');
        }
      } finally {
        setIsLoading(false);
      }
    }, []);

    // Load on mount
    useEffect(() => {
      void refresh();
    }, [refresh]);

    // ── Start trial ─────────────────────────────────────────────────────────
    const startTrial = useCallback(async (plan: 'customer' | 'business') => {
      setIsLoading(true);
      setError(null);
      try {
        await paymentService.startTrial(plan);
        await refresh();
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? 'Failed to start trial';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    }, [refresh]);

    // ── Cancel ──────────────────────────────────────────────────────────────
    const cancel = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        await paymentService.cancelSubscription();
        await refresh();
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? 'Failed to cancel subscription';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    }, [refresh]);

    // ── Reactivate ──────────────────────────────────────────────────────────
    const reactivate = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        await paymentService.reactivateSubscription();
        await refresh();
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? 'Failed to reactivate';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    }, [refresh]);

    return {
      subscription,
      isLoading,
      error,
      isTrialing,
      isActive,
      isPastDue,
      isCanceled,
      hasAccess,
      pendingCancellation,
      daysLeftInTrial,
      trialPlan,
      refresh,
      startTrial,
      cancel,
      reactivate,
    };
  },
);
