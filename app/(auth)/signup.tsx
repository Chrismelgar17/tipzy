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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, User, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';


import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    dob?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
      setDob(formatDateForDisplay(selectedDate));
      setErrors(prev => ({ ...prev, dob: undefined }));
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const confirmDateSelection = () => {
    if (dobDate) {
      setDob(formatDateForDisplay(dobDate));
      setErrors(prev => ({ ...prev, dob: undefined }));
    }
    setShowDatePicker(false);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!dobDate) {
      newErrors.dob = 'Date of birth is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      if (dobDate) {
        await signUp(email.trim().toLowerCase(), password, name.trim(), dobDate);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      height: 150,
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
    signUpButton: {
      height: 56,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden' as const,
      marginTop: theme.spacing.sm,
    },
    signUpButtonGradient: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    signUpButtonText: {
      color: theme.colors.white,
      fontSize: 18,
      fontWeight: '600' as const,
    },
    countryCodeButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      marginRight: theme.spacing.sm,
    },
    countryCodeText: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '500' as const,
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
    ageNotice: {
      backgroundColor: 'rgba(108, 92, 231, 0.1)',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.purple,
    },
    ageNoticeText: {
      color: theme.colors.purple,
      fontSize: 14,
      textAlign: 'center' as const,
    },
    disclaimer: {
      backgroundColor: 'rgba(108, 92, 231, 0.05)',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(108, 92, 231, 0.2)',
      marginBottom: theme.spacing.md,
    },
    disclaimerText: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'left' as const,
    },
    terms: {
      color: theme.colors.text.tertiary,
      fontSize: 12,
      textAlign: 'center' as const,
      lineHeight: 18,
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
    signInLink: {
      color: theme.colors.cyan,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    verificationContainer: {
      alignItems: 'center' as const,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      marginVertical: theme.spacing.md,
    },
    verificationTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    verificationText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center' as const,
      marginBottom: theme.spacing.lg,
    },
    verificationInput: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: 24,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
      letterSpacing: 8,
      marginBottom: theme.spacing.md,
      minWidth: 200,
    },
    demoText: {
      color: theme.colors.text.tertiary,
      fontSize: 12,
      fontStyle: 'italic' as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end' as const,
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
      paddingBottom: 34,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.text.primary,
    },
    modalButton: {
      fontSize: 16,
      color: theme.colors.cyan,
    },
    modalConfirmButton: {
      fontWeight: '600' as const,
    },
    datePicker: {
      backgroundColor: theme.colors.background,
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
        />

        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the nightlife community</Text>

          <View style={styles.form}>
            <View style={[styles.inputContainer, errors.name ? styles.inputError : null]}>
              <User size={20} color={theme.colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.text.tertiary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors(prev => ({ ...prev, name: undefined }));
                }}
                autoCapitalize="words"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
              <Mail size={20} color={theme.colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.text.tertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
              <Lock size={20} color={theme.colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Create password (6+ characters)"
                placeholderTextColor={theme.colors.text.tertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors(prev => ({ ...prev, password: undefined }));
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity
              style={[styles.inputContainer, errors.dob ? styles.inputError : null]}
              onPress={openDatePicker}
            >
              <Calendar size={20} color={theme.colors.text.tertiary} />
              <Text style={[styles.input, { paddingVertical: 18 }, !dob && { color: theme.colors.text.tertiary }]}>
                {dob || 'Select your date of birth'}
              </Text>
            </TouchableOpacity>
            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                This app is intended for users 18+ and is for discovering nightlife venues. You must be 21+ to consume alcohol where required by law. Users are responsible for following local laws and venue policies.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[theme.colors.cyan, theme.colors.purple]}
                style={styles.signUpButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Date Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Text style={styles.modalButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text style={[styles.modalButton, styles.modalConfirmButton]}>Done</Text>
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
                style={styles.datePicker}
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

    </KeyboardAvoidingView>
  );
}