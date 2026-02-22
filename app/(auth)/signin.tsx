import React, { useState, useEffect, useMemo } from 'react';
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
import { Mail, Lock, Sparkles, Phone, Apple, Chrome } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { signIn, signInWithProvider } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const expoUsername = process.env.EXPO_PUBLIC_EXPO_USERNAME;
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const googleRedirectUri = useMemo(() => {
    if (isExpoGo && expoUsername) {
      // Expo Auth Proxy — valid HTTPS redirect URI Google accepts
      return `https://auth.expo.io/@${expoUsername}/nightlife-access-app`;
    }
    return makeRedirectUri({ scheme: 'tipzy', path: 'auth' });
  }, [isExpoGo, expoUsername]);
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(
    googleWebClientId
      ? {
          clientId: (isExpoGo && expoUsername) ? googleWebClientId : undefined,
          webClientId: googleWebClientId,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          androidClientId: (isExpoGo && expoUsername) ? undefined : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
          // Proxy mode uses Web client which needs client_secret for code exchange;
          // force Token (implicit) flow to get access_token directly instead.
          responseType: (isExpoGo && expoUsername) ? ResponseType.Token : undefined,
          scopes: ['openid', 'profile', 'email'],
          redirectUri: googleRedirectUri,
        }
      : null as any,
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.authentication?.idToken ?? (googleResponse as any).params?.id_token;
      const accessToken = googleResponse.authentication?.accessToken ?? (googleResponse as any).params?.access_token;
      setIsLoading(true);
      signInWithProvider('google', { idToken: idToken ?? undefined, accessToken: accessToken ?? undefined })
        .catch((err: any) => Alert.alert('Google Sign In Failed', err?.message || 'Unable to sign in with Google'))
        .finally(() => setIsLoading(false));
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google Sign In Failed', (googleResponse as any).error?.message || 'Authentication failed');
    }
  }, [googleResponse]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!email.trim()) {
      newErrors.email = usePhone ? 'Phone number is required' : 'Email is required';
    } else if (!usePhone && !validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (usePhone && !validatePhone(email)) {
      newErrors.email = 'Please enter a valid phone number';
    }
    
    if (!usePhone && !password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      if (usePhone) {
        const normalizedPhone = `+1${email.replace(/\D/g, '')}`;
        const last4 = normalizedPhone.slice(-4);
        await signInWithProvider('phone', {
          phone: normalizedPhone,
          name: `Phone User ${last4}`,
          providerSubject: normalizedPhone,
        });
      } else {
        await signIn(email.trim().toLowerCase(), password);
      }
    } catch (error: any) {
      const message = error?.message || 'Invalid credentials';
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('connection')) {
        Alert.alert('Connection Error', message);
      } else {
        setErrors({ email: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return a valid identity token');
      }
      const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();

      await signInWithProvider('apple', {
        idToken: credential.identityToken,
        providerSubject: credential.user,
        name: displayName || undefined,
        email: credential.email ?? undefined,
      });
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert('Apple Sign In Failed', error?.message || 'Unable to sign in with Apple');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!googleWebClientId) {
      Alert.alert('Google Sign In Not Configured', 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env and restart Expo.');
      return;
    }
    if (isExpoGo && !expoUsername) {
      Alert.alert(
        'Expo Login Required',
        'Google Sign In in Expo Go requires an Expo account:\n\n' +
        '1. Run in terminal: bunx expo login\n' +
        '2. Add EXPO_PUBLIC_EXPO_USERNAME=<your-username> to .env\n' +
        '3. Add https://auth.expo.io/@<username>/nightlife-access-app\n   to Google Console → Web client → Authorized redirect URIs'
      );
      return;
    }
    if (!googleRequest) return;
    try {
      if (isExpoGo && expoUsername) {
        // Must call /start so the proxy stores the returnUrl session;
        // otherwise auth.expo.io can't redirect back to the app.
        const returnUrl = Linking.createURL('expo-auth-session');
        const authUrl = await googleRequest.makeAuthUrlAsync(Google.discovery);
        const proxyBaseUrl = `https://auth.expo.io/@${expoUsername}/nightlife-access-app`;
        const startUrl = `${proxyBaseUrl}/start?${new URLSearchParams({ authUrl, returnUrl })}`;
        await googlePromptAsync({ url: startUrl });
      } else {
        await googlePromptAsync();
      }
    } catch (err: any) {
      Alert.alert('Google Sign In Failed', err?.message || 'Could not start sign in');
    }
  };

  const handleSignUp = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(auth)/signup');
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
      fontWeight: '700' as const,
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
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
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
      alignSelf: 'flex-end' as const,
    },
    forgotPasswordText: {
      color: theme.colors.cyan,
      fontSize: 14,
    },
    signInButton: {
      height: 56,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden' as const,
      marginTop: theme.spacing.sm,
    },
    signInButtonGradient: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    signInButtonText: {
      color: theme.colors.white,
      fontSize: 18,
      fontWeight: '600' as const,
    },
    divider: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
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
    socialButton: {
      height: 56,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    socialButtonText: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '500' as const,
    },
    footer: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
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
      fontWeight: '600' as const,
    },
    demoText: {
      color: theme.colors.text.tertiary,
      fontSize: 12,
      textAlign: 'center' as const,
      marginTop: theme.spacing.lg,
    },
    inputError: {
      borderWidth: 1,
      borderColor: '#ff4444',
    },
    errorText: {
      color: '#ff4444',
      fontSize: 12,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
    },
    appleButton: {
      backgroundColor: '#000000',
      flexDirection: 'row' as const,
      gap: theme.spacing.sm,
    },
    googleButton: {
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border,
      borderWidth: 1,
      flexDirection: 'row' as const,
      gap: theme.spacing.sm,
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
          colors={[theme.colors.purple, theme.colors.cyan]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles size={48} color={theme.colors.white} />
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access the best nightlife</Text>

          <View style={styles.form}>
            <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
              {usePhone ? (
                <Phone size={20} color={theme.colors.text.tertiary} />
              ) : (
                <Mail size={20} color={theme.colors.text.tertiary} />
              )}
              <TextInput
                style={styles.input}
                placeholder={usePhone ? "Enter your phone number" : "Enter your email"}
                placeholderTextColor={theme.colors.text.tertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                keyboardType={usePhone ? "phone-pad" : "email-address"}
                autoCapitalize="none"
                testID="email-input"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {!usePhone && (
              <>
                <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
                  <Lock size={20} color={theme.colors.text.tertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    secureTextEntry
                    testID="password-input"
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </>
            )}

            {!usePhone && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/forgot-password' as any)}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              disabled={isLoading}
              testID="signin-button"
            >
              <LinearGradient
                colors={[theme.colors.purple, theme.colors.purpleLight]}
                style={styles.signInButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.signInButtonText}>{usePhone ? 'Continue with Phone' : 'Sign In'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => {
                setUsePhone(!usePhone);
                setErrors({});
              }}
            >
              <Text style={styles.socialButtonText}>
                {usePhone ? 'Use Email Instead' : 'Use Phone Number'}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleSignIn}
              >
                <Apple size={20} color={theme.colors.white} />
                <Text style={[styles.socialButtonText, { color: theme.colors.white }]}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.socialButton, styles.googleButton]}
              onPress={handleGoogleSignIn}
            >
              <Chrome size={20} color={theme.colors.text.primary} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {!googleWebClientId && (
            <Text style={styles.demoText}>Google Sign In requires a Web Client ID — tap the button for setup steps.</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
