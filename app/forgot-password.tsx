import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import * as Haptics from 'expo-haptics';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { forgotPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert(
        'Reset Link Sent',
        'Check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      paddingTop: Math.max(insets.top, theme.spacing.xl),
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignSelf: 'center',
      marginBottom: theme.spacing.xl,
      overflow: 'hidden',
    },
    iconGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    form: {
      gap: theme.spacing.lg,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      height: 56,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: 16,
    },
    resetButton: {
      height: 56,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      marginTop: theme.spacing.sm,
    },
    resetButtonGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resetButtonText: {
      color: theme.colors.white,
      fontSize: 18,
      fontWeight: '600',
    },
    footer: {
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    footerText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    backToSignIn: {
      marginTop: theme.spacing.md,
    },
    backToSignInText: {
      color: theme.colors.cyan,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[theme.colors.purple, theme.colors.cyan]}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Mail size={32} color={theme.colors.white} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Mail size={20} color={theme.colors.text.tertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="email-input"
                />
              </View>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetPassword}
                disabled={isLoading}
                testID="reset-button"
              >
                <LinearGradient
                  colors={[theme.colors.purple, theme.colors.purpleLight]}
                  style={styles.resetButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.white} />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Remember your password?
              </Text>
              <TouchableOpacity
                style={styles.backToSignIn}
                onPress={() => router.back()}
              >
                <Text style={styles.backToSignInText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}