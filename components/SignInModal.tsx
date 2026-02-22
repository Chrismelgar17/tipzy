import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, X, Sparkles, Phone, Calendar, CheckSquare, Square, Chrome, Apple } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-context';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface SignInModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function SignInModal({ visible, onClose, title, subtitle }: SignInModalProps) {
  const { signIn, signUp, signInWithProvider } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);

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
        .then(() => { onClose(); resetForm(); })
        .catch((err: any) => Alert.alert('Google Sign In Failed', err?.message || 'Unable to sign in with Google'))
        .finally(() => setIsLoading(false));
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google Sign In Failed', (googleResponse as any).error?.message || 'Authentication failed');
    }
  }, [googleResponse]);

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple did not return a valid identity token');
      const displayName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();
      await signInWithProvider('apple', {
        idToken: credential.identityToken,
        providerSubject: credential.user,
        name: displayName || undefined,
        email: credential.email ?? undefined,
      });
      onClose();
      resetForm();
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', error?.message || 'Unable to sign in with Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      await signIn(email, password);
      onClose();
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name || !confirmPassword || !dateOfBirth) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!ageConfirmed) {
      Alert.alert('Error', 'You must confirm that you are at least 18 years old');
      return;
    }

    // Validate age
    const dob = new Date(dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) {
      Alert.alert('Error', 'You must be at least 18 years old to create an account');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      const dob = new Date(dateOfBirth);
      await signUp(email, password, name, dob);
      onClose();
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setDateOfBirth('');
    setAgeConfirmed(false);
    setIsSignUp(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSocialSignIn = (provider: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Mock social sign in - in real app this would integrate with actual providers
    Alert.alert('Coming Soon', `${provider} sign-in will be available soon!`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <Text style={styles.title}>
              {title || (isSignUp ? 'Create Account' : 'Welcome Back')}
            </Text>
            <Text style={styles.subtitle}>
              {subtitle || (isSignUp ? 'Join the nightlife community' : 'Sign in to continue')}
            </Text>

            <View style={styles.form}>
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Mail size={20} color={theme.colors.text.tertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    testID="name-input"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color={theme.colors.text.tertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="email-input"
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
                  testID="password-input"
                />
              </View>

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Lock size={20} color={theme.colors.text.tertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    testID="confirm-password-input"
                  />
                </View>
              )}

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Calendar size={20} color={theme.colors.text.tertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Date of Birth (YYYY-MM-DD)"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    testID="dob-input"
                  />
                </View>
              )}

              {isSignUp && (
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setAgeConfirmed(!ageConfirmed)}
                >
                  {ageConfirmed ? (
                    <CheckSquare size={20} color={theme.colors.purple} />
                  ) : (
                    <Square size={20} color={theme.colors.text.tertiary} />
                  )}
                  <Text style={styles.checkboxText}>
                    I confirm that I am at least 18 years old
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={isSignUp ? handleSignUp : handleSignIn}
                disabled={isLoading}
                testID={isSignUp ? "signup-button" : "signin-button"}
              >
                <LinearGradient
                  colors={[theme.colors.purple, theme.colors.purpleLight]}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, { backgroundColor: '#000' }]}
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                >
                  <Apple size={20} color="#fff" />
                  <Text style={[styles.socialButtonText, { color: '#fff' }]}>Continue with Apple</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome size={20} color={theme.colors.text.primary} />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                  // Navigate to sign-in screen for phone login
                  const { router } = require('expo-router');
                  router.push('/(auth)/signin');
                }}
              >
                <Phone size={20} color={theme.colors.text.primary} />
                <Text style={styles.socialButtonText}>Continue with Phone</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.switchModeLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>

            {isSignUp && (
              <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                  By creating an account, you agree that Tipzy helps users discover nightlife venues but does not promote underage drinking. Users are responsible for following local laws and the entry/drinking policies of each venue, including any 21+ alcohol rules.
                </Text>
              </View>
            )}
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    height: 160,
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
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  primaryButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
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
  socialButton: {
    height: 56,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: 8,
  },
  socialButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
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
  switchModeLink: {
    color: theme.colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  checkboxText: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  disclaimerContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disclaimerText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  demoText: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});