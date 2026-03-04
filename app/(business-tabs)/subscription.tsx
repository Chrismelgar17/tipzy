/**
 * Business Subscription Tab
 *
 * States:
 *  • No plan         → hype copy + 2 plan cards (Monthly $99 | Yearly $999)
 *                      both with 30-day free trial
 *  • Trialing        → trial banner, feature list, days remaining, cancel
 *  • Active          → plan badge, feature list, renewal date, cancel
 *  • Past due        → warning strip + update-card CTA
 *  • Cancel pending  → "access until" strip + reactivate
 *  • Canceled        → restart CTA
 *
 * Bottom of every state: payment history pulled from /api/stripe/audit-log
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useSubscription } from '@/hooks/subscription-context';
import { useAuth } from '@/hooks/auth-context';
import * as paymentService from '@/lib/payment.service';

// ─── Plan definitions (financial dept pricing) ────────────────────────────────
const BUSINESS_PLANS = [
  {
    key: 'business_monthly' as const,
    brand: '🔥 Starter Monthly',
    tagline: 'Most popular · no long-term commitment',
    price: '$99',
    period: '/month',
    yearlyEquiv: '$1,188/yr',
    trialLabel: '30-day free trial',
    trialDays: 30,
    color: '#6C5CE7',
    gradientColors: ['#6C5CE7', '#4834D4'] as const,
    badge: 'MOST POPULAR',
  },
  {
    key: 'business_yearly' as const,
    brand: '⚡ Starter Yearly',
    tagline: 'Best value — save $189 a year',
    price: '$999',
    period: '/year',
    yearlyEquiv: '~$83/mo',
    trialLabel: '30-day free trial',
    trialDays: 30,
    color: '#00D1FF',
    gradientColors: ['#00D1FF', '#0099BB'] as const,
    badge: 'BEST DEAL · SAVE 16%',
  },
];

// ─── Features per plan ────────────────────────────────────────────────────────
const FEATURES_BY_PLAN = {
  monthly: [
    { icon: '🔔', label: 'Event push alerts',        desc: 'Blast your night to thousands nearby' },
    { icon: '📊', label: 'Live crowd analytics',     desc: 'See your floor fill up in real time' },
    { icon: '📷', label: 'Venue photo gallery',      desc: 'Make them want to come before they arrive' },
    { icon: '📱', label: 'QR check-in scanner',      desc: 'Zero lines, max vibes' },
    { icon: '🗺️', label: 'Discovery map listing',    desc: 'Get found by every party-seeker nearby' },
    { icon: '📈', label: 'Weekly report',            desc: 'Revenue & views every Monday' },
  ],
  yearly: [
    { icon: '🔔', label: 'Event push alerts',        desc: 'Blast your night to thousands nearby' },
    { icon: '📊', label: 'Live crowd analytics',     desc: 'See your floor fill up in real time' },
    { icon: '📷', label: 'Venue photo gallery',      desc: 'Make them want to come before they arrive' },
    { icon: '📱', label: 'QR check-in scanner',      desc: 'Zero lines, max vibes' },
    { icon: '🗺️', label: 'Discovery map listing',    desc: 'Get found by every party-seeker nearby' },
    { icon: '📈', label: 'Weekly report',            desc: 'Revenue & views every Monday' },
    { icon: '🚀', label: 'Promo boost ×4/year',      desc: 'We push you to #1 on the Tipzy map' },
    { icon: '⭐', label: 'Priority listing badge',   desc: 'Rank above every free venue, always' },
  ],
};

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  trialing:            { label: 'Free Trial',     color: '#00D9A3', icon: Sparkles },
  active:              { label: 'Active',          color: '#00D9A3', icon: CheckCircle2 },
  past_due:            { label: 'Payment Due',     color: '#FFB800', icon: AlertCircle },
  canceled:            { label: 'Canceled',        color: '#FF6B6B', icon: XCircle },
  incomplete:          { label: 'Incomplete',      color: '#FFB800', icon: AlertCircle },
  incomplete_expired:  { label: 'Expired',         color: '#FF6B6B', icon: XCircle },
  unpaid:              { label: 'Unpaid',          color: '#FF6B6B', icon: AlertCircle },
};

type AuditEntry = {
  id: string;
  event_type: string;
  amount_cents: number | null;
  currency: string;
  description: string | null;
  status: string;
  created_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtMoney(cents: number | null, currency: string) {
  if (cents === null) return '—';
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}
function daysUntil(iso: string | null | undefined) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function BusinessSubscriptionScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    subscription,
    isLoading,
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    hasAccess,
    pendingCancellation,
    daysLeftInTrial,
    startTrial,
    cancel,
    reactivate,
    refresh,
  } = useSubscription();

  const [auditLog, setAuditLog]       = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [startingPlan, setStartingPlan] = useState<string | null>(null);
  const [featuresTab, setFeaturesTab] = useState<'monthly' | 'yearly'>('monthly');

  // ── Load payment history ────────────────────────────────────────────────────
  const loadAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await (paymentService as any).getPaymentHistory();
      setAuditLog(data.entries ?? []);
    } catch {
      setAuditLog([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => { loadAuditLog(); }, [loadAuditLog]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadAuditLog()]);
    setRefreshing(false);
  }, [refresh, loadAuditLog]);

  // ── Start trial handler ─────────────────────────────────────────────────────
  const handleStartTrial = async (planKey: 'business_monthly' | 'business_yearly') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Map yearly to monthly key for backend (we'll add yearly price ID later)
    const backendPlan = planKey === 'business_yearly' ? 'business_monthly' : 'business_monthly';
    setStartingPlan(planKey);
    try {
      await startTrial(backendPlan);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Trial started!', 'Your 30-day free trial is now active. Welcome to the Tipzy Business family!');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('payment') || msg.includes('card')) {
        Alert.alert('Add a card first', "We need a payment method on file to start your trial (we won't charge it for 30 days).", [
          { text: 'Add Card', onPress: () => router.push('/payment-methods') },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Could not start trial', msg);
      }
    } finally {
      setStartingPlan(null);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      "You'll keep access until the end of the current billing period. You can reactivate anytime.",
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            try { await cancel(); } catch (e: any) { Alert.alert('Error', e?.message); }
          },
        },
      ],
    );
  };

  const handleReactivate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await reactivate(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    catch (e: any) { Alert.alert('Error', e?.message); }
  };

  const s = makeStyles(theme);

  // ── Status badge colour ─────────────────────────────────────────────────────
  const statusMeta = subscription ? (STATUS_META[subscription.status] ?? STATUS_META['active']) : null;
  const trialDaysLeft = daysLeftInTrial;
  const renewalDays   = daysUntil(subscription?.currentPeriodEnd ?? undefined);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.purple} />}
    >
      {/* ── Hero ── */}
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={s.hero}>
        <Text style={s.heroEyebrow}>YOUR PLAN</Text>
        <Text style={s.heroTitle}>
          {hasAccess ? "🚀 You're live on Tipzy" : '🎯 Grow your crowd'}
        </Text>
        <Text style={s.heroSub}>
          {hasAccess
            ? 'Your venue is being discovered by hundreds of party-seekers right now.'
            : 'Turn your venue into the hottest spot in town. Start free, grow forever.'}
        </Text>

        {/* Status badge */}
        {statusMeta && (
          <View style={[s.statusBadge, { borderColor: statusMeta.color }]}>
            <statusMeta.icon size={14} color={statusMeta.color} />
            <Text style={[s.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Active / Trial banner ── */}
      {(isTrialing || isActive) && subscription && (
        <View style={s.activeBanner}>
          <LinearGradient colors={isTrialing ? ['#00D9A3', '#00A87D'] : ['#6C5CE7', '#4834D4']} style={s.activeBannerGrad}>
            <View>
              <Text style={s.activePlan}>
                {isTrialing ? `🌟 Free Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left` : '✅ Subscription Active'}
              </Text>
              {subscription.currentPeriodEnd && (
                <Text style={s.activeSub}>
                  {isTrialing
                    ? `Trial ends ${fmtDate(subscription.trialEnd ?? subscription.currentPeriodEnd)}`
                    : pendingCancellation
                      ? `Access until ${fmtDate(subscription.currentPeriodEnd)}`
                      : `Renews in ${renewalDays} day${renewalDays !== 1 ? 's' : ''} · ${fmtDate(subscription.currentPeriodEnd)}`}
                </Text>
              )}
            </View>
            {pendingCancellation ? (
              <TouchableOpacity style={s.reactivateBtn} onPress={handleReactivate} activeOpacity={0.85}>
                <RefreshCw size={14} color="#fff" />
                <Text style={s.reactivateBtnLabel}>Reactivate</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
                <Text style={s.cancelSmall}>Cancel</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      )}

      {/* ── Past-due warning ── */}
      {isPastDue && (
        <TouchableOpacity style={s.pastDueBanner} onPress={() => router.push('/payment-methods')} activeOpacity={0.8}>
          <AlertCircle size={18} color="#FFB800" />
          <View style={{ flex: 1 }}>
            <Text style={s.pastDueTitle}>Payment failed</Text>
            <Text style={s.pastDueSub}>Update your card to keep your venue live on Tipzy.</Text>
          </View>
          <ChevronRight size={16} color="#FFB800" />
        </TouchableOpacity>
      )}

      {/* ── Canceled strip ── */}
      {isCanceled && (
        <View style={s.canceledBanner}>
          <XCircle size={16} color="#FF6B6B" />
          <Text style={s.canceledText}>Your subscription has ended. Restart to get back on the map.</Text>
        </View>
      )}

      {/* ── No plan: plan cards ── */}
      {!hasAccess && !isLoading && (
        <View style={s.plansSection}>
          <Text style={s.sectionTitle}>Pick your plan</Text>
          <Text style={s.sectionSub}>Both include a full 30-day free trial. No charges until day 31.</Text>

          {BUSINESS_PLANS.map((plan) => (
            <View key={plan.key} style={s.planCard}>
              {plan.badge && (
                <View style={[s.planBadge, { backgroundColor: plan.color }]}>
                  <Text style={s.planBadgeLabel}>{plan.badge}</Text>
                </View>
              )}
              <LinearGradient colors={[plan.color + '22', plan.color + '08']} style={s.planCardInner}>
                <View style={s.planRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.planBrand}>{plan.brand}</Text>
                    <Text style={s.planTagline}>{plan.tagline}</Text>
                  </View>
                  <View style={s.planPriceBlock}>
                    <Text style={[s.planPrice, { color: plan.color }]}>{plan.price}</Text>
                    <Text style={s.planPeriod}>{plan.period}</Text>
                  </View>
                </View>

                <View style={[s.trialPill, { borderColor: plan.color }]}>
                  <Clock size={12} color={plan.color} />
                  <Text style={[s.trialPillLabel, { color: plan.color }]}>
                    {plan.trialLabel} · then {plan.price}{plan.period}
                  </Text>
                </View>
                {plan.key === 'business_yearly' && (
                  <Text style={s.savingNote}>≈ {plan.yearlyEquiv} — you save $189 vs monthly 🎉</Text>
                )}
                {plan.key === 'business_monthly' && (
                  <Text style={s.savingNote}>Switch to yearly anytime and save 16%</Text>
                )}

                <TouchableOpacity
                  style={[s.ctaBtn, { backgroundColor: plan.color }]}
                  onPress={() => handleStartTrial(plan.key)}
                  disabled={startingPlan !== null}
                  activeOpacity={0.85}
                >
                  {startingPlan === plan.key
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.ctaBtnLabel}>
                        {plan.key === 'business_yearly'
                          ? 'Lock In Best Price — Free 30 Days →'
                          : 'Claim My Free Month →'}
                      </Text>
                  }
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ))}

          <TouchableOpacity onPress={() => router.push('/payment-methods')} style={s.addCardLink} activeOpacity={0.7}>
            <CreditCard size={14} color={theme.colors.text.tertiary} />
            <Text style={s.addCardLinkLabel}>Need to add a card first?</Text>
            <ChevronRight size={14} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Features tabs ── */}
      <View style={s.featuresSection}>
        <Text style={s.sectionTitle}>
          {hasAccess ? "🎁 What you've unlocked" : '🔓 What you unlock'}
        </Text>

        {/* Pill toggle */}
        <View style={s.ftToggle}>
          <TouchableOpacity
            style={[s.ftPill, featuresTab === 'monthly' && s.ftPillActive]}
            onPress={() => setFeaturesTab('monthly')}
            activeOpacity={0.8}
          >
            <Text style={[s.ftPillLabel, featuresTab === 'monthly' && s.ftPillLabelActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ftPill, featuresTab === 'yearly' && s.ftPillActive]}
            onPress={() => setFeaturesTab('yearly')}
            activeOpacity={0.8}
          >
            <Text style={[s.ftPillLabel, featuresTab === 'yearly' && s.ftPillLabelActive]}>Yearly  ⭐ +2</Text>
          </TouchableOpacity>
        </View>

        {/* Feature cards */}
        {FEATURES_BY_PLAN[featuresTab].map((f, i) => (
          <View key={i} style={s.ftCard}>
            <Text style={s.ftEmoji}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.ftLabel}>{f.label}</Text>
              <Text style={s.ftDesc}>{f.desc}</Text>
            </View>
            {hasAccess
              ? <CheckCircle2 size={16} color="#00D9A3" />
              : <View style={s.ftLock}><Text style={s.ftLockIcon}>🔒</Text></View>
            }
          </View>
        ))}
      </View>

      {/* ── Payment history ── */}
      <View style={s.historySection}>
        <Text style={s.sectionTitle}>💳 Payment History</Text>
        {auditLoading ? (
          <ActivityIndicator color={theme.colors.purple} style={{ marginTop: 16 }} />
        ) : auditLog.length === 0 ? (
          <View style={s.emptyHistory}>
            <Calendar size={28} color={theme.colors.text.tertiary} />
            <Text style={s.emptyHistoryTitle}>No payments yet</Text>
            <Text style={s.emptyHistoryDesc}>
              Your trial is completely free. Charges appear here once your plan activates on day 31.
            </Text>
          </View>
        ) : (
          auditLog.map((entry) => {
            const isCredit = (entry.amount_cents ?? 0) < 0;
            const isFailed  = entry.status === 'failed' || entry.status === 'uncollectible';
            return (
              <View key={entry.id} style={s.historyRow}>
                <View style={[s.historyDot, isFailed ? s.historyDotFail : isCredit ? s.historyDotCredit : s.historyDotPay]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.historyType}>
                    {entry.description ?? entry.event_type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={s.historyDate}>{fmtDate(entry.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[
                    s.historyAmount,
                    isFailed ? { color: '#FF6B6B' } : isCredit ? { color: '#00D9A3' } : {},
                  ]}>
                    {fmtMoney(entry.amount_cents, entry.currency)}
                  </Text>
                  <View style={[s.historyStatus, isFailed ? s.historyStatusFail : s.historyStatusOk]}>
                    <Text style={s.historyStatusLabel}>{entry.status}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Manage plan footer ── */}
      {hasAccess && (
        <TouchableOpacity style={s.manageRow} onPress={() => router.push('/payment-methods')} activeOpacity={0.75}>
          <CreditCard size={18} color={theme.colors.purple} />
          <Text style={s.manageRowLabel}>Manage payment methods</Text>
          <ChevronRight size={18} color={theme.colors.text.tertiary} />
        </TouchableOpacity>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(theme: any) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 32 },

    // Hero
    hero: { padding: 28, paddingTop: 40, paddingBottom: 32 },
    heroEyebrow: { color: theme.colors.purple, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
    heroTitle: { color: theme.colors.text.primary, fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 10 },
    heroSub:   { color: theme.colors.text.secondary, fontSize: 15, lineHeight: 22 },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
      alignSelf: 'flex-start', marginTop: 16,
    },
    statusLabel: { fontSize: 13, fontWeight: '600' },

    // Active / trial banner
    activeBanner: { marginHorizontal: 16, marginTop: -8, borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
    activeBannerGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16,
    },
    activePlan: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
    activeSub:  { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    cancelSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textDecorationLine: 'underline' },
    reactivateBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    reactivateBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Past-due
    pastDueBanner: {
      margin: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: '#2A1F00', borderWidth: 1, borderColor: '#FFB800',
      borderRadius: 12, padding: 14,
    },
    pastDueTitle: { color: '#FFB800', fontWeight: '700', fontSize: 13 },
    pastDueSub:   { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },

    // Canceled
    canceledBanner: {
      margin: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#1F0000', borderWidth: 1, borderColor: '#FF6B6B',
      borderRadius: 12, padding: 14,
    },
    canceledText: { color: theme.colors.text.secondary, fontSize: 13, flex: 1 },

    // Plans
    plansSection: { paddingHorizontal: 16, paddingTop: 24 },
    sectionTitle: { color: theme.colors.text.primary, fontSize: 19, fontWeight: '700', marginBottom: 6 },
    sectionSub:   { color: theme.colors.text.tertiary, fontSize: 13, marginBottom: 20, lineHeight: 18 },
    planCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    planCardInner: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    planBadge: { position: 'absolute', top: 0, right: 16, zIndex: 10, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
    planBadgeLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    planRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    planBrand: { color: theme.colors.text.primary, fontSize: 17, fontWeight: '700', marginBottom: 4 },
    planTagline: { color: theme.colors.text.tertiary, fontSize: 13 },
    planPriceBlock: { alignItems: 'flex-end' },
    planPrice:  { fontSize: 28, fontWeight: '800' },
    planPeriod: { color: theme.colors.text.tertiary, fontSize: 12, marginTop: -2 },
    trialPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    trialPillLabel: { fontSize: 12, fontWeight: '600' },
    savingNote: { color: '#00D9A3', fontSize: 12, fontWeight: '600', marginBottom: 14 },
    ctaBtn:       { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    ctaBtnLabel:  { color: '#fff', fontSize: 15, fontWeight: '700' },
    addCardLink:  { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 12, paddingVertical: 8 },
    addCardLinkLabel: { color: theme.colors.text.tertiary, fontSize: 13 },

    // Features tabs
    featuresSection: { paddingHorizontal: 16, paddingTop: 28 },
    ftToggle: {
      flexDirection: 'row', backgroundColor: theme.colors.card,
      borderRadius: 12, padding: 4, marginBottom: 16, marginTop: 12,
    },
    ftPill: {
      flex: 1, paddingVertical: 9, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    ftPillActive: { backgroundColor: theme.colors.purple },
    ftPillLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text.tertiary },
    ftPillLabelActive: { color: '#fff' },
    ftCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: theme.colors.card, borderRadius: 14,
      paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8,
      borderWidth: 1, borderColor: theme.colors.border,
    },
    ftEmoji:  { fontSize: 22, width: 32, textAlign: 'center' },
    ftLabel:  { color: theme.colors.text.primary,   fontSize: 14, fontWeight: '700', marginBottom: 2 },
    ftDesc:   { color: theme.colors.text.tertiary, fontSize: 12, lineHeight: 17 },
    ftLock:   { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    ftLockIcon: { fontSize: 13 },

    // Payment history
    historySection: { paddingHorizontal: 16, paddingTop: 28 },
    emptyHistory: { alignItems: 'center', paddingVertical: 28, gap: 10 },
    emptyHistoryTitle: { color: theme.colors.text.secondary, fontSize: 15, fontWeight: '600' },
    emptyHistoryDesc:  { color: theme.colors.text.tertiary, fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.colors.border },
    historyDot:       { width: 10, height: 10, borderRadius: 5 },
    historyDotPay:    { backgroundColor: theme.colors.purple },
    historyDotCredit: { backgroundColor: '#00D9A3' },
    historyDotFail:   { backgroundColor: '#FF6B6B' },
    historyType:   { color: theme.colors.text.primary,   fontSize: 13, fontWeight: '500', marginBottom: 2 },
    historyDate:   { color: theme.colors.text.tertiary,  fontSize: 11 },
    historyAmount: { color: theme.colors.text.primary,   fontSize: 14, fontWeight: '700', marginBottom: 3 },
    historyStatus: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    historyStatusOk:   { backgroundColor: 'rgba(108,92,231,0.15)' },
    historyStatusFail: { backgroundColor: 'rgba(255,107,107,0.15)' },
    historyStatusLabel: { fontSize: 10, color: theme.colors.text.tertiary, fontWeight: '600', textTransform: 'uppercase' },

    // Manage footer
    manageRow: {
      margin: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: theme.colors.card, borderRadius: 14, padding: 16,
    },
    manageRowLabel: { flex: 1, color: theme.colors.text.primary, fontSize: 14, fontWeight: '500' },
  });
}
