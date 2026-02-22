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
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Building2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function BusinessSignInScreen() {
  const { theme } = useTheme();
  const { signInBusiness } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      await signInBusiness(email.trim().toLowerCase(), password);
    } catch (error: any) {
      Alert.alert('Sign In Failed', error?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/onboarding');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingBottom: insets.bottom,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: insets.top,
    },
    headerGradient: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xl,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      height: 56,
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: 16,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
    },
    forgotPasswordText: {
      color: theme.colors.cyan,
      fontSize: 14,
    },
    signInButton: {
      height: 56,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      marginTop: theme.spacing.sm,
    },
    signInButtonGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signInButtonText: {
      color: theme.colors.white,
      fontSize: 18,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      color: theme.colors.text.tertiary,
      marginHorizontal: theme.spacing.md,
      fontSize: 14,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    footerText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
    },
    signUpLink: {
      color: theme.colors.cyan,
      fontSize: 14,
      fontWeight: '600',
    },
    backButton: {
      position: 'absolute',
      top: insets.top + theme.spacing.md,
      left: theme.spacing.md,
      zIndex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[theme.colors.cyan, theme.colors.purple]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={{ color: theme.colors.white, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Building2 size={48} color={theme.colors.white} />
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.title}>Business Sign In</Text>
          <Text style={styles.subtitle}>Access your business dashboard</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color={theme.colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Business Email"
                placeholderTextColor={theme.colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="business-email-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                testID="business-password-input"
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/forgot-password' as any)}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              disabled={isLoading}
              testID="business-signin-button"
            >
              <LinearGradient
                colors={[theme.colors.cyan, theme.colors.cyanLight]}
                style={styles.signInButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have a business account?</Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>Register Business</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}