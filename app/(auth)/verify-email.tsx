import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, RefreshCcw } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { theme } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const { pendingVerificationEmail, verificationPreviewUrl, verificationToken, resendVerification, verifyEmail } = useAuth();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = useMemo(() => (params.email as string) || pendingVerificationEmail || '', [params.email, pendingVerificationEmail]);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Enter code', 'Please enter the verification code.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyEmail(code.trim());
    } catch (error: any) {
      Alert.alert('Verification failed', error?.message || 'Invalid or expired code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerification(email);
      Alert.alert('Email sent', 'Check your inbox for a new verification code.');
    } catch (error: any) {
      Alert.alert('Resend failed', error?.message || 'Could not resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <LinearGradient colors={[theme.colors.purple, theme.colors.cyan]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Mail size={48} color={theme.colors.white} />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle} numberOfLines={2}>We sent a verification code to {email || 'your inbox'}. Enter it below to continue.</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={styles.input}
          placeholder="123456"
          placeholderTextColor={theme.colors.text.tertiary}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          keyboardType="number-pad"
          autoFocus
        />

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={isSubmitting}>
          <LinearGradient colors={[theme.colors.purple, theme.colors.purpleLight]} style={styles.verifyButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isSubmitting ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.verifyButtonText}>Verify and continue</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.muted}>Didn’t get it?</Text>
          <TouchableOpacity onPress={handleResend} disabled={isResending} style={styles.resendButton}>
            <RefreshCcw size={16} color={theme.colors.cyan} />
            <Text style={styles.resendText}>{isResending ? 'Sending…' : 'Resend email'}</Text>
          </TouchableOpacity>
        </View>


        {verificationPreviewUrl ? (
          <TouchableOpacity onPress={() => Linking.openURL(verificationPreviewUrl)}>
            <Text style={styles.previewLink}>Open email preview</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={() => router.replace('/(auth)/signin' as any)} style={styles.backLink}>
          <Text style={styles.backLinkText}>Change email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: theme.spacing.sm,
  },
  title: { color: theme.colors.white, fontSize: 28, fontWeight: '700' as const },
  subtitle: { color: theme.colors.white, opacity: 0.9, fontSize: 14, lineHeight: 20 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  label: { color: theme.colors.text.secondary, fontSize: 14 },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  verifyButton: { height: 56, borderRadius: theme.borderRadius.md, overflow: 'hidden' as const },
  verifyButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verifyButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '600' as const },
  resendRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.sm },
  resendButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.xs },
  resendText: { color: theme.colors.cyan, fontWeight: '600' as const },
  muted: { color: theme.colors.text.tertiary },
  tokenHint: { color: theme.colors.text.secondary, fontSize: 12 },
  previewLink: { color: theme.colors.cyan, fontSize: 14, fontWeight: '600' as const },
  backLink: { marginTop: theme.spacing.lg },
  backLinkText: { color: theme.colors.text.secondary, textDecorationLine: 'underline' },
});
