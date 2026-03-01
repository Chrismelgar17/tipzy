/**
 * Subscription Screen – Phase 4
 *
 * States handled:
 *  • No subscription      → choose Customer / Business plan, start free trial
 *  • Trialing             → shows trial end date + days remaining + cancel option
 *  • Active               → shows renewal date + cancel option
 *  • Past due             → warns of failed payment + link to update card
 *  • Cancel pending       → shows access-until date + reactivate button
 *  • Canceled             → invite to restart
 *
 * Card requirement: if no payment method on file, tapping "Start Free Trial"
 * redirects to Payment Methods first.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Zap,
  Star,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/hooks/subscription-context';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import * as paymentService from '@/lib/payment.service';

// ─── Plan catalogue (3+ branded tiers) ──────────────────────────────────────
const PLANS = [
  {
    key: 'customer_monthly' as const,
    brand: 'Tipzy Plus',
    tagline: 'For nightlife fans',
    price: '$4.99',
    period: '/mo',
    trialLabel: '7-day free trial',
    trialDays: 7,
    icon: Zap,
    color: '#7C3AED',
    features: [
      'Unlimited venue discovery',
      'Real-time crowd levels',
      'Ticket purchasing',
      'Digital wallet',
      'Event notifications',
    ],
  },
  {
    key: 'customer_pro' as const,
    brand: 'Tipzy Pro',
    tagline: 'For power users',
    badge: 'Most Popular',
    price: '$9.99',
    period: '/mo',
    trialLabel: '7-day free trial',
    trialDays: 7,
    icon: Star,
    color: '#2563EB',
    features: [
      'Everything in Tipzy Plus',
      'Priority entry notifications',
      'Exclusive pre-sale access',
      'Advanced filters & search',
      'VIP event recommendations',
      'Dedicated support',
    ],
  },
  {
    key: 'business_monthly' as const,
    brand: 'Business Starter',
    tagline: 'For venue owners',
    price: '$29.99',
    period: '/mo',
    trialLabel: '30-day free trial',
    trialDays: 30,
    icon: Building2,
    color: '#059669',
    features: [
      'Venue management dashboard',
      'Real-time capacity tracking',
      'Order management',
      'QR scanner for check-ins',
      'Basic analytics',
      'Customer notifications',
    ],
  },
  {
    key: 'business_pro' as const,
    brand: 'Business Pro',
    tagline: 'Scale your venue',
    badge: 'Best Value',
    price: '$59.99',
    period: '/mo',
    trialLabel: '90-day free trial',
    trialDays: 90,
    icon: Building2,
    color: '#D97706',
    features: [
      'Everything in Business Starter',
      'Advanced analytics & reporting',
      'Multi-venue management',
      'Staff account access',
      'API integrations',
      'Priority support & onboarding',
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const insets    = useSafeAreaInsets();
  const { user }  = useAuth();
  const {
    subscription,
    isLoading,
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    pendingCancellation,
    daysLeftInTrial,
    refresh,
    startTrial,
    cancel,
    reactivate,
  } = useSubscription();

  const [starting, setStarting] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // ── Start trial flow ────────────────────────────────────────────────────────
  const handleStartTrial = async (plan: string) => {
    if (!user) {
      router.push('/(auth)/signin' as any);
      return;
    }

    // Check for a payment method first
    let hasPm = false;
    try {
      const { methods } = await paymentService.listPaymentMethods();
      hasPm = methods.length > 0;
    } catch {}

    if (!hasPm) {
      Alert.alert(
        'Payment Method Required',
        'Add a card before starting your free trial. You won\'t be charged until after the trial ends.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Add Card',
            onPress: () => router.push('/payment-methods' as any),
          },
        ],
      );
      return;
    }

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setStarting(plan);
    try {
      await startTrial(plan);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Trial Started! 🎉',
        `Your ${PLANS.find(p => p.key === plan)?.trialLabel ?? 'free trial'} is now active. We\'ll remind you before it ends.`,
        [{ text: 'Got it' }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to start trial. Please try again.');
    } finally {
      setStarting(null);
    }
  };

  // ── Cancel flow ─────────────────────────────────────────────────────────────
  const handleCancel = () => {
    const accessUntil = formatDate(subscription?.currentPeriodEnd);
    Alert.alert(
      'Cancel Subscription?',
      `You'll keep full access until ${accessUntil}. After that your account reverts to the free tier.`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setCanceling(true);
            try {
              await cancel();
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to cancel. Please try again.');
            } finally {
              setCanceling(false);
            }
          },
        },
      ],
    );
  };

  // ── Reactivate flow ─────────────────────────────────────────────────────────
  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await reactivate();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Subscription Reactivated', 'Your subscription will continue as normal.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to reactivate. Please try again.');
    } finally {
      setReactivating(false);
    }
  };

  // ── Status badge ─────────────────────────────────────────────────────────────
  function StatusBadge() {
    if (!subscription) return null;

    const configs = {
      trialing:          { icon: Clock,        color: theme.colors.purple, label: 'Free Trial' },
      active:            { icon: CheckCircle2, color: theme.colors.success, label: 'Active' },
      past_due:          { icon: AlertCircle,  color: theme.colors.error,  label: 'Payment Failed' },
      canceled:          { icon: XCircle,      color: theme.colors.text.tertiary, label: 'Canceled' },
      incomplete:        { icon: AlertCircle,  color: theme.colors.warning, label: 'Incomplete' },
      incomplete_expired:{ icon: XCircle,      color: theme.colors.text.tertiary, label: 'Expired' },
      unpaid:            { icon: AlertCircle,  color: theme.colors.error,  label: 'Unpaid' },
    };

    const cfg  = configs[subscription.status as keyof typeof configs] ?? configs.canceled;
    const Icon = cfg.icon;

    return (
      <View style={[ss.badge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
        <Icon size={14} color={cfg.color} />
        <Text style={[ss.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        {pendingCancellation && (
          <Text style={[ss.badgeText, { color: theme.colors.warning }]}> · Cancels {formatDate(subscription.currentPeriodEnd)}</Text>
        )}
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  const styles = makeStyles(theme);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Subscription',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Active subscription card ───────────────────────────────────── */}
        {subscription && subscription.status !== 'canceled' && (
          <View style={styles.activeCard}>
            <View style={styles.activeCardHeader}>
              <Star size={20} color={theme.colors.purple} />
              <Text style={styles.activeCardTitle}>
                {PLANS.find(p => p.key === subscription.plan)?.brand
                  ?? (subscription.plan.startsWith('business') ? 'Business' : 'Tipzy')}
              </Text>
              <StatusBadge />
            </View>

            {/* Trial countdown */}
            {isTrialing && (
              <View style={styles.trialCountdown}>
                <Text style={styles.trialDays}>{daysLeftInTrial}</Text>
                <Text style={styles.trialLabel}>days left in trial</Text>
                <Text style={styles.trialEnd}>
                  Trial ends {formatDate(subscription.trialEnd)}
                </Text>
              </View>
            )}

            {/* Active billing */}
            {isActive && !pendingCancellation && (
              <View style={styles.billingRow}>
                <Calendar size={16} color={theme.colors.text.secondary} />
                <Text style={styles.billingText}>
                  Next billing on {formatDate(subscription.currentPeriodEnd)}
                </Text>
              </View>
            )}

            {/* Past due */}
            {isPastDue && (
              <TouchableOpacity
                style={styles.pastDueBanner}
                onPress={() => router.push('/payment-methods' as any)}
              >
                <AlertCircle size={16} color={theme.colors.error} />
                <Text style={styles.pastDueText}>
                  Last payment failed. Update your card to avoid losing access.
                </Text>
                <ChevronRight size={16} color={theme.colors.error} />
              </TouchableOpacity>
            )}

            {/* Cancel pending */}
            {pendingCancellation && (
              <View style={styles.cancelPendingBanner}>
                <Clock size={16} color={theme.colors.warning} />
                <Text style={styles.cancelPendingText}>
                  Access until {formatDate(subscription.currentPeriodEnd)}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              {!pendingCancellation && (isTrialing || isActive || isPastDue) && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={canceling}
                >
                  {canceling
                    ? <ActivityIndicator size="small" color={theme.colors.error} />
                    : <Text style={styles.cancelBtnText}>Cancel Plan</Text>
                  }
                </TouchableOpacity>
              )}
              {pendingCancellation && (
                <TouchableOpacity
                  style={styles.reactivateBtn}
                  onPress={handleReactivate}
                  disabled={reactivating}
                >
                  {reactivating
                    ? <ActivityIndicator size="small" color={theme.colors.white} />
                    : <>
                        <RefreshCw size={16} color={theme.colors.white} />
                        <Text style={styles.reactivateBtnText}>Keep Subscription</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cardBtn}
                onPress={() => router.push('/payment-methods' as any)}
              >
                <CreditCard size={16} color={theme.colors.text.secondary} />
                <Text style={styles.cardBtnText}>Manage Cards</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Plan selection (shown when no active sub OR canceled) ─────── */}
        {(!subscription || isCanceled) && (
          <>
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Choose Your Plan</Text>
              <Text style={styles.heroSubtitle}>
                Start free — no charge until after your trial ends.{'\n'}
                Cancel anytime.
              </Text>
            </View>

            {PLANS.map((plan) => {
              const PlanIcon = plan.icon;
              const isStarting = starting === plan.key;

              return (
                <View key={plan.key} style={[
                  styles.planCard,
                  (plan as any).badge ? { borderColor: plan.color + '66', borderWidth: 2 } : {},
                ]}>
                  {(plan as any).badge && (
                    <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                      <Text style={styles.popularBadgeText}>{(plan as any).badge}</Text>
                    </View>
                  )}
                  <View style={[styles.planIconWrap, { backgroundColor: plan.color + '22' }]}>
                    <PlanIcon size={28} color={plan.color} />
                  </View>

                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.brand}</Text>
                    <Text style={styles.planTagline}>{plan.tagline}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                    <View style={[styles.trialBadge, { backgroundColor: plan.color + '22' }]}>
                      <Zap size={12} color={plan.color} />
                      <Text style={[styles.trialBadgeText, { color: plan.color }]}>
                        {plan.trialLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureList}>
                    {plan.features.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <CheckCircle2 size={15} color={plan.color} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.startBtn, { backgroundColor: plan.color }]}
                    onPress={() => handleStartTrial(plan.key)}
                    disabled={isStarting || isLoading}
                    activeOpacity={0.85}
                  >
                    {isStarting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.startBtnText}>
                          Start {plan.trialLabel} Free
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              );
            })}

            <Text style={styles.disclaimer}>
              Your card won't be charged until after the trial ends. By starting a trial you
              agree to our{' '}
              <Text
                style={{ color: theme.colors.purple }}
                onPress={() => router.push('/terms-conditions' as any)}
              >
                Terms of Service
              </Text>
              .
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // ── Active card ─────────────────────────────────────────────────────────
    activeCard: {
      margin: 16,
      padding: 20,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    activeCardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text.primary,
      flex: 1,
    },
    trialCountdown: {
      alignItems: 'center',
      paddingVertical: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
    },
    trialDays: {
      fontSize: 56,
      fontWeight: '800',
      color: theme.colors.purple,
      lineHeight: 64,
    },
    trialLabel: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: 4,
    },
    trialEnd: {
      fontSize: 13,
      color: theme.colors.text.tertiary,
    },
    billingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    billingText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    pastDueBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.error + '18',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.error + '44',
    },
    pastDueText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.error,
    },
    cancelPendingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.warning + '18',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.warning + '44',
    },
    cancelPendingText: {
      fontSize: 13,
      color: theme.colors.warning,
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      color: theme.colors.error,
      fontSize: 14,
      fontWeight: '600',
    },
    reactivateBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.success,
    },
    reactivateBtnText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    cardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardBtnText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
    },

    // ── Plan selection ──────────────────────────────────────────────────────
    heroSection: {
      padding: 24,
      paddingBottom: 8,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 15,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    planCard: {
      margin: 16,
      marginTop: 8,
      padding: 20,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    popularBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    popularBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    planIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    planHeader: {
      marginBottom: 16,
    },
    planName: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    planTagline: {
      fontSize: 13,
      color: theme.colors.text.tertiary,
      marginBottom: 8,
    },
    planPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
      marginBottom: 8,
    },
    planPrice: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.text.primary,
    },
    planPeriod: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    trialBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    trialBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    featureList: {
      gap: 10,
      marginBottom: 20,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      flex: 1,
    },
    startBtn: {
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    disclaimer: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginHorizontal: 24,
      lineHeight: 18,
      marginBottom: 8,
    },
  });
}
