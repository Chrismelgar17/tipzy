import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { CheckCircle, Clock, Mail, ArrowLeft } from 'lucide-react-native';

export default function BusinessConfirmationScreen() {
  const { theme } = useTheme();
  const { upgradeAccountToBusiness, completeOnboarding, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && !isAuthenticated) {
    router.replace('/(auth)/signin' as any);
    return null;
  }

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const profileRaw = await AsyncStorage.getItem('businessProfile');
      if (!profileRaw) {
        Alert.alert('Error', 'Business data not found. Please start over.');
        router.replace('/onboarding' as any);
        return;
      }

      const profile = JSON.parse(profileRaw);
      const phone = profile.phone ? `+1${profile.phone.replace(/\D/g, '')}` : undefined;

      // Convert workHours {isOpen, openTime, closeTime} → {open, close} for API
      const hours: Record<string, { open: string; close: string }> = {};
      if (profile.workHours) {
        for (const [day, val] of Object.entries(profile.workHours as Record<string, any>)) {
          if (val.isOpen) hours[day] = { open: val.openTime, close: val.closeTime };
        }
      }

      // Upgrade user role + create the venue atomically in one backend call.
      // The backend returns a new business-role token AND the new venueId.
      await upgradeAccountToBusiness(
        profile.businessName,
        profile.category,
        phone,
        {
          address: profile.location ?? '',
          lat: (profile as any).lat ?? undefined,
          lng: (profile as any).lng ?? undefined,
          capacity: profile.maxCapacity ?? 100,
          minAge: profile.minEntryAge === '21+' ? 21 : 18,
          hours,
          genres: profile.services ?? [],
          photos: profile.galleryImages ?? [],
        },
      );

      await AsyncStorage.removeItem('businessProfile');
      await completeOnboarding();
      // upgradeAccountToBusiness already navigates to /(business-tabs)/dashboard
    } catch (error: any) {
      const message = error?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${theme.colors.success}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold' as const,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: 40,
      lineHeight: 26,
    },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      marginBottom: 24,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    infoIcon: {
      marginRight: 16,
    },
    infoText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.primary,
      lineHeight: 22,
    },
    nextStepsTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    stepNumberText: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: 'bold' as const,
    },
    stepText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.primary,
      lineHeight: 22,
    },
    finishButton: {
      backgroundColor: theme.colors.purple,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 32,
      width: '100%',
    },
    finishButtonText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.white,
    },
    backButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
      width: '100%',
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: theme.colors.text.secondary,
    },
    note: {
      backgroundColor: `${theme.colors.warning}20`,
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      width: '100%',
    },
    noteText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Registration',
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
          <View style={styles.iconContainer}>
            <CheckCircle size={64} color={theme.colors.success} />
          </View>

          <Text style={styles.title}>Registration Submitted!</Text>
          <Text style={styles.subtitle}>
            Your business profile has been submitted and is awaiting approval from our admin team.
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Clock size={24} color={theme.colors.purple} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Review typically takes 1-3 business days
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Mail size={24} color={theme.colors.purple} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                You&apos;ll receive an email notification once your profile is approved
              </Text>
            </View>
          </View>

          <Text style={styles.nextStepsTitle}>What happens next?</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Our admin team will review your business information and gallery images
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Once approved, you&apos;ll gain access to the business dashboard
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Start creating events, managing tickets, and connecting with customers
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.finishButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleFinish}
            disabled={isSubmitting}
            testID="finish-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.finishButtonText}>Complete Registration</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/home' as any)}
            disabled={isSubmitting}
          >
            <Text style={styles.backButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Your business account will remain inactive until approved by our admin team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}