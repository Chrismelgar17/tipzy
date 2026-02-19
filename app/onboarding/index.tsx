import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { Users, Building2 } from 'lucide-react-native';

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { setUserType } = useAuth();
  const router = useRouter();

  const handleCustomerSelect = async () => {
    await setUserType('customer');
    router.replace('/(auth)/signin');
  };

  const handleBusinessSelect = async () => {
    await setUserType('business');
    router.push('/onboarding/business-form' as any);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
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
      marginBottom: 48,
      lineHeight: 24,
    },
    optionContainer: {
      width: '100%',
      marginBottom: 20,
    },
    optionButton: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionButtonActive: {
      borderColor: theme.colors.purple,
      backgroundColor: `${theme.colors.purple}15`,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    optionTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    optionDescription: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to NightLife</Text>
        <Text style={styles.subtitle}>
          Choose how you&apos;d like to use our platform
        </Text>

        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleCustomerSelect}
            testID="customer-option"
          >
            <View style={styles.iconContainer}>
              <Users size={32} color="white" />
            </View>
            <Text style={styles.optionTitle}>I&apos;m a Customer</Text>
            <Text style={styles.optionDescription}>
              Discover venues, buy tickets, and enjoy nightlife experiences
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleBusinessSelect}
            testID="business-option"
          >
            <View style={styles.iconContainer}>
              <Building2 size={32} color="white" />
            </View>
            <Text style={styles.optionTitle}>I&apos;m a Business</Text>
            <Text style={styles.optionDescription}>
              Register your venue and manage events, tickets, and customers
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}