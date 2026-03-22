import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/theme-context';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react-native';

const PLANS = [
  {
    key: 'business_monthly',
    brand: '🔥 Starter Monthly',
    tagline: 'Most popular · no long-term commitment',
    price: '$99',
    period: '/month',
    trialLabel: '30-day free trial · then $99/month',
    color: '#6C5CE7',
    gradientColors: ['#6C5CE7', '#4834D4'] as const,
    badge: 'MOST POPULAR',
    saving: 'Switch to yearly anytime and save 16%',
    cta: 'Claim My Free Month →',
  },
  {
    key: 'business_yearly',
    brand: '⚡ Starter Yearly',
    tagline: 'Best value — save $189 a year',
    price: '$999',
    period: '/year',
    trialLabel: '30-day free trial · then $999/year',
    color: '#00D1FF',
    gradientColors: ['#00D1FF', '#0099BB'] as const,
    badge: 'BEST DEAL · SAVE 16%',
    saving: '≈ ~$83/mo — you save $189 vs monthly 🎉',
    cta: 'Lock In Best Price — Free 30 Days →',
  },
];

export default function BusinessPlansScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSelect = (key: string) => {
    setSelectedPlan(key);
  };

  const handleContinue = async () => {
    if (!selectedPlan) {
      Alert.alert('Plan Required', 'Please select a plan to continue.');
      return;
    }

    setIsChecking(true);
    try {
      const raw = await AsyncStorage.getItem('businessProfile');
      const profile = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(
        'businessProfile',
        JSON.stringify({ ...profile, selectedPlan }),
      );
      router.push('/payment-methods?fromOnboarding=true' as any);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },
    heading: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.text.primary,
      marginBottom: 6,
    },
    subheading: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginBottom: 28,
      lineHeight: 20,
    },
    planCard: {
      marginBottom: 18,
      borderRadius: 18,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    planCardSelected: {
      borderColor: '#fff',
    },
    planBadge: {
      position: 'absolute',
      top: 0,
      right: 16,
      zIndex: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    planBadgeLabel: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    planCardInner: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    planBrand: {
      color: theme.colors.text.primary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },
    planTagline: { color: theme.colors.text.tertiary, fontSize: 13 },
    planPriceBlock: { alignItems: 'flex-end' },
    planPrice: { fontSize: 30, fontWeight: '800' },
    planPeriod: { color: theme.colors.text.tertiary, fontSize: 12, marginTop: -2 },
    trialPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderRadius: 20,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 10,
    },
    trialPillLabel: { fontSize: 12, fontWeight: '600' },
    savingNote: { color: '#00D9A3', fontSize: 12, fontWeight: '600', marginBottom: 16 },
    selectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    selectCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
    note: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 28,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    noteText: { flex: 1, color: theme.colors.text.secondary, fontSize: 13, lineHeight: 19 },
    continueButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    continueButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Choose Your Plan',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <Text style={styles.heading}>Pick your plan</Text>
          <Text style={styles.subheading}>
            Both include a full 30-day free trial. No charges until day 31.
          </Text>

          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.key}
              style={[styles.planCard, selectedPlan === plan.key && styles.planCardSelected]}
              onPress={() => handleSelect(plan.key)}
              activeOpacity={0.85}
            >
              {plan.badge && (
                <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.planBadgeLabel}>{plan.badge}</Text>
                </View>
              )}
              <LinearGradient colors={[plan.color + '28', plan.color + '0A']} style={styles.planCardInner}>
                <View style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planBrand}>{plan.brand}</Text>
                    <Text style={styles.planTagline}>{plan.tagline}</Text>
                  </View>
                  <View style={styles.planPriceBlock}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>

                <View style={[styles.trialPill, { borderColor: plan.color }]}>
                  <Clock size={12} color={plan.color} />
                  <Text style={[styles.trialPillLabel, { color: plan.color }]}>
                    {plan.trialLabel}
                  </Text>
                </View>

                <Text style={styles.savingNote}>{plan.saving}</Text>

                <View style={styles.selectRow}>
                  {selectedPlan === plan.key ? (
                    <CheckCircle2 size={22} color="#fff" />
                  ) : (
                    <View style={[styles.selectCircle, { borderColor: plan.color }]} />
                  )}
                  <Text style={styles.selectLabel}>
                    {selectedPlan === plan.key ? 'Selected' : 'Select this plan'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          <View style={styles.note}>
            <Clock size={16} color={theme.colors.text.tertiary} style={{ marginTop: 1 }} />
            <Text style={styles.noteText}>
              Your free trial starts once your business is approved. You won't be charged until after the trial ends.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, (!selectedPlan || isChecking) && { opacity: 0.5 }]}
            onPress={handleContinue}
            disabled={!selectedPlan || isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>
                {selectedPlan ? 'Continue with Selected Plan →' : 'Select a Plan to Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
