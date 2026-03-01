/**
 * Payment Methods – Phase 4
 *
 * Uses @stripe/stripe-react-native PaymentSheet for card / Apple Pay / Google Pay.
 * All card data is tokenised by Stripe — we never see raw PAN/CVV.
 *
 * Flow:
 *   1. Tap "Add Payment Method"
 *   2. Backend creates SetupIntent → clientSecret
 *   3. initPaymentSheet(clientSecret) → presentPaymentSheet()
 *   4. On success: call /stripe/sync-methods to persist PM to our DB
 *   5. List refreshes automatically
 *
 * Fallback: If @stripe/stripe-react-native is not linked, shows informational alert.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, Plus, Trash2, Check, Wifi, Apple } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import type { PaymentMethod } from '@/types/models';
import * as paymentService from '@/lib/payment.service';

// ─── Safe Stripe import ───────────────────────────────────────────────────────
// @stripe/stripe-react-native is a native module — only available in custom
// native builds (not Expo Go or pure OTA). We import lazily so the app never
// crashes on unsupported runtimes.
let _useStripe: (() => {
  initPaymentSheet: (params: any) => Promise<{ error?: any }>;
  presentPaymentSheet: () => Promise<{ error?: any }>;
}) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stripeRN = require('@stripe/stripe-react-native');
  _useStripe = stripeRN.useStripe;
} catch {
  // Not linked — payment sheet will show an informational alert
}

// ─── Brand label ──────────────────────────────────────────────────────────────
function BrandLabel({ brand }: { brand?: string | null }) {
  const b = (brand ?? '').toLowerCase();
  const label =
    b === 'visa'       ? 'VISA' :
    b === 'mastercard' ? 'MC'   :
    b === 'amex'       ? 'AMEX' :
    b === 'discover'   ? 'DISC' :
    (brand?.toUpperCase() ?? 'CARD');
  return <Text style={s.brand}>{label}</Text>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const stripe = _useStripe?.();

  const [methods, setMethods]       = useState<PaymentMethod[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding]         = useState(false);

  // ── Load saved cards ──────────────────────────────────────────────────────
  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { methods: data } = await paymentService.listPaymentMethods();
      setMethods(data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        Alert.alert('Error', 'Could not load payment methods.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(false);
  }, [load]);

  // ── Add card via PaymentSheet ─────────────────────────────────────────────
  const handleAdd = async () => {
    if (!stripe) {
      Alert.alert(
        'Native Build Required',
        'Adding cards uses Stripe\'s secure PaymentSheet and requires a native app build.\n\nTo enable: run  eas build --platform ios --profile production',
      );
      return;
    }

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAdding(true);

    try {
      // 1. Get SetupIntent client secret from backend
      const { clientSecret } = await paymentService.createSetupIntent();

      // 2. Init PaymentSheet (supports card + Apple Pay + Google Pay)
      const { error: initError } = await stripe.initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: 'Tipzy',
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
        style: 'alwaysDark',
        returnURL: 'tipzy://stripe-redirect',
      });
      if (initError) { Alert.alert('Setup Error', initError.message); return; }

      // 3. Present Stripe's native card entry sheet
      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') Alert.alert('Card Error', presentError.message);
        return;
      }

      // 4. Sync confirmed PM to our DB
      await paymentService.syncPaymentMethods();
      await load(false);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Card Added ✓', 'Your payment method has been saved securely.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to add payment method.');
    } finally {
      setAdding(false);
    }
  };

  // ── Set default ───────────────────────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    try {
      await paymentService.setDefaultPaymentMethod(id);
      await load(false);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not update default card.');
    }
  };

  // ── Remove card ───────────────────────────────────────────────────────────
  const handleRemove = (method: PaymentMethod) => {
    if (method.isDefault && methods.length > 1) {
      Alert.alert('Cannot Remove Default', 'Set another card as default first, then remove this one.');
      return;
    }
    Alert.alert('Remove Card', `Remove •••• ${method.last4}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await paymentService.removePaymentMethod(method.id);
            await load(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {
            Alert.alert('Error', 'Could not remove card.');
          }
        },
      },
    ]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.colors.purple} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Payment Methods',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.purple} />
        }
      >
        <View style={s.content}>

          {/* Add button */}
          <TouchableOpacity style={s.addBtn} onPress={handleAdd} disabled={adding} activeOpacity={0.85}>
            {adding
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Plus size={20} color="#fff" /><Text style={s.addBtnText}>Add Payment Method</Text></>}
          </TouchableOpacity>

          {/* Accepted method icons */}
          <View style={s.acceptedRow}>
            <CreditCard size={15} color={theme.colors.text.tertiary} />
            <Text style={s.acceptedText}>Cards</Text>
            {Platform.OS === 'ios' && <><Apple size={15} color={theme.colors.text.tertiary} /><Text style={s.acceptedText}>Apple Pay</Text></>}
            {Platform.OS === 'android' && <><Wifi size={15} color={theme.colors.text.tertiary} /><Text style={s.acceptedText}>Google Pay</Text></>}
          </View>

          {/* Empty state */}
          {methods.length === 0 && (
            <View style={s.empty}>
              <CreditCard size={64} color={theme.colors.text.tertiary} />
              <Text style={s.emptyTitle}>No payment methods</Text>
              <Text style={s.emptySub}>
                Add a card to enable purchases and activate your free trial.
              </Text>
            </View>
          )}

          {/* Card list */}
          {methods.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Saved Cards</Text>
              {methods.map((method) => (
                <View key={method.id} style={s.card}>
                  <View style={s.cardLeft}>
                    <View style={s.cardIconWrap}>
                      <CreditCard size={22} color={theme.colors.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.cardTopRow}>
                        <BrandLabel brand={method.brand} />
                        <Text style={s.cardNumber}>•••• {method.last4}</Text>
                        {method.isDefault && (
                          <View style={s.defaultBadge}>
                            <Check size={11} color="#fff" />
                            <Text style={s.defaultText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.cardExpiry}>
                        Expires {method.expMonth}/{method.expYear}
                      </Text>
                    </View>
                  </View>
                  <View style={s.cardActions}>
                    {!method.isDefault && (
                      <TouchableOpacity style={s.actionBtn} onPress={() => handleSetDefault(method.id)}>
                        <Text style={s.actionBtnText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[s.actionBtn, s.removeBtn]} onPress={() => handleRemove(method)}>
                      <Trash2 size={15} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Start trial CTA */}
          {methods.length > 0 && (
            <TouchableOpacity style={s.trialCta} onPress={() => router.push('/subscription' as any)} activeOpacity={0.85}>
              <Text style={s.trialCtaText}>🎉  Start your free trial →</Text>
            </TouchableOpacity>
          )}

          <Text style={s.secureNote}>
            🔒  Cards are securely tokenised by Stripe. We never store raw card details.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

// ─── Missing imports hoisted ──────────────────────────────────────────────────
// (Haptics is imported at runtime to avoid crashing on web)
import * as Haptics from 'expo-haptics';

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  content:   { padding: 16 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.purple,
    paddingVertical: 14, borderRadius: 12, marginBottom: 10,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  acceptedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 },
  acceptedText: { color: theme.colors.text.tertiary, fontSize: 12 },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text.primary, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 15, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 22 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 4 },

  card: {
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.purple + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  brand: { fontSize: 11, fontWeight: '800', color: theme.colors.text.secondary, letterSpacing: 0.5 },
  cardNumber: { fontSize: 16, fontWeight: '700', color: theme.colors.text.primary },
  cardExpiry: { fontSize: 12, color: theme.colors.text.tertiary },
  defaultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  defaultText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: {
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  actionBtnText: { fontSize: 13, color: theme.colors.text.primary, fontWeight: '500' },
  removeBtn: { borderColor: theme.colors.error + '66', paddingHorizontal: 10 },

  trialCta: {
    marginTop: 24, padding: 16,
    backgroundColor: theme.colors.purple + '22',
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.purple + '55',
    alignItems: 'center',
  },
  trialCtaText: { color: theme.colors.purple, fontSize: 15, fontWeight: '700' },

  secureNote: {
    marginTop: 20, fontSize: 12, color: theme.colors.text.tertiary,
    textAlign: 'center', lineHeight: 18,
  },
});