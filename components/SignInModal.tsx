import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-context';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { nativeGoogleSignIn, GoogleSignInCancelledError, GoogleSignInSimulatorError } from '@/lib/google-signin';

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
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const formatDateForDisplay = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDobDate(selectedDate);
      setDateOfBirth(formatDateForDisplay(selectedDate));
    }
  };

  const openDatePicker = () => setShowDatePicker(true);
  const closeDatePicker = () => setShowDatePicker(false);
  const confirmDateSelection = () => {
    if (dobDate) setDateOfBirth(formatDateForDisplay(dobDate));
    setShowDatePicker(false);
  };

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    try {
      const { accessToken } = await nativeGoogleSignIn();
      await signInWithProvider('google', { accessToken });
      onClose();
      resetForm();
    } catch (err: any) {
      if (err instanceof GoogleSignInCancelledError) return;
      if (err instanceof GoogleSignInSimulatorError) {
        Alert.alert('Google Sign In Unavailable', err.message);
        return;
      }
      Alert.alert('Google Sign In Failed', err?.message || 'Unable to sign in with Google');
    } finally {
      setIsLoading(false);
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
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      const isAppleUnavailable =
        error?.code === 1000 ||
        error?.code === 'ERR_APPLE_AUTHENTICATION_REQUEST_FAILED' ||
        error?.message?.includes('1000') ||
        error?.message?.includes('AKAuthenticationError') ||
        error?.message?.includes('unknown reason') ||
        error?.message?.includes('AuthorizationError');
      if (isAppleUnavailable) {
        Alert.alert(
          'Apple Sign In Unavailable',
          'Sign In with Apple is not configured for this build. Please sign in with email or Google instead.',
        );
        return;
      }
      Alert.alert('Apple Sign In Failed', error?.message || 'Unable to sign in with Apple');
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
    const dob = dobDate ?? new Date(dateOfBirth);
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
      const dob = dobDate ?? new Date(dateOfBirth);
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
    setDobDate(null);
    setShowDatePicker(false);
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
                <TouchableOpacity style={styles.inputContainer} onPress={openDatePicker}>
                  <Calendar size={20} color={theme.colors.text.tertiary} />
                  <Text style={[styles.input, { paddingVertical: 18 }, !dateOfBirth && { color: theme.colors.text.tertiary }]}>
                    {dateOfBirth || 'Select your date of birth'}
                  </Text>
                </TouchableOpacity>
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

      {/* Date of Birth Picker */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent={true} animationType="slide">
          <View style={styles.dobModalOverlay}>
            <View style={styles.dobModalContent}>
              <View style={styles.dobModalHeader}>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Text style={styles.dobModalButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dobModalTitle}>Date of Birth</Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text style={[styles.dobModalButton, styles.dobModalConfirm]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dobDate || new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                textColor="#FFFFFF"
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={dobDate || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )
      )}
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
  dobModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dobModalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  dobModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dobModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  dobModalButton: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    paddingHorizontal: 4,
  },
  dobModalConfirm: {
    color: theme.colors.purple,
    fontWeight: '600',
  },
});