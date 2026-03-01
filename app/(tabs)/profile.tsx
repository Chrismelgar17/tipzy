import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  Heart,
  Settings,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  QrCode,
  Building2,
  User,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { useSubscription } from '@/hooks/subscription-context';

import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, signOut, requireAuth, emailVerified, resendVerification, pendingVerificationEmail, isLoading, isBusiness, businessStatus } = useAuth();
  const { subscription, isTrialing, daysLeftInTrial } = useSubscription();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: insets.top,
    },
    header: {
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    profileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.purple,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.white,
      fontSize: 32,
      fontWeight: '600',
    },
    userInfo: {
      marginLeft: theme.spacing.md,
      flex: 1,
    },
    userName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginBottom: 8,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    verifiedText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '600',
    },
    editButton: {
      backgroundColor: theme.colors.purple,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-start',
    },
    editButtonText: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: '600',
    },
    adminSection: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    adminButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.purple,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    adminButtonText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    menu: {
      paddingTop: theme.spacing.md,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.card,
      marginBottom: 1,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    menuItemLabel: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    menuItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    menuItemValue: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
    },
    switchViewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.purple,
      borderRadius: theme.borderRadius.md,
    },
    switchViewLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    switchViewIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    switchViewTitle: {
      color: theme.colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
    switchViewSub: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      marginTop: 2,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    signOutText: {
      fontSize: 16,
      color: theme.colors.error,
      fontWeight: '600',
    },
    version: {
      textAlign: 'center',
      color: theme.colors.text.tertiary,
      fontSize: 12,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xxl,
    },
    unauthenticatedContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    unauthenticatedContent: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    unauthenticatedTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    unauthenticatedSubtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    signInButton: {
      backgroundColor: theme.colors.purple,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    signInButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (user && !emailVerified) {
    const email = pendingVerificationEmail || user.email;
    return (
      <View style={[styles.container, { padding: theme.spacing.lg }]}> 
        <Text style={styles.unauthenticatedTitle}>Verify your email</Text>
        <Text style={styles.unauthenticatedSubtitle}>
          We sent a verification code to {email}. Verify your account to access your profile.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: theme.colors.purple, padding: theme.spacing.md, borderRadius: theme.borderRadius.md }}
          onPress={() => router.replace({ pathname: '/(auth)/verify-email', params: { email } } as any)}
        >
          <Text style={{ color: theme.colors.white, fontWeight: '600', textAlign: 'center' }}>Enter verification code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: theme.spacing.md }}
          onPress={() => resendVerification().catch(() => Alert.alert('Error', 'Could not resend email'))}
        >
          <Text style={{ color: theme.colors.cyan, textAlign: 'center' }}>Resend verification email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If user is not authenticated, show sign-in prompt
  if (!user) {
    if (isLoading) return null;
    return (
      <View style={[styles.container, styles.unauthenticatedContainer]}>
        <View style={styles.unauthenticatedContent}>
          <User size={64} color={theme.colors.text.tertiary} />
          <Text style={styles.unauthenticatedTitle}>Sign In Required</Text>
          <Text style={styles.unauthenticatedSubtitle}>
            Sign in to view your profile, favorites, and manage your account
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => requireAuth('view your profile')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const menuItems = [
    ...(!isBusiness ? [{
      icon: Building2,
      label: businessStatus === 'pending'
        ? 'Business Approval Pending'
        : 'Register Your Venue',
      value: businessStatus === 'pending'
        ? 'Awaiting admin review'
        : 'Business owners',
      onPress: () => {
        if (businessStatus === 'pending') {
          // Already submitted — inform the user
        } else {
          router.push('/onboarding/business-form' as any);
        }
      },
    }] : []),
    {
      icon: Heart,
      label: 'Favorites',
      value: `${user?.favorites.length || 0} venues`,
      onPress: () => router.push('/favorites' as any),
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      value: '',
      onPress: () => router.push('/payment-methods' as any),
    },
    {
      icon: Zap,
      label: 'Subscription',
      value: isTrialing
        ? `Trial · ${daysLeftInTrial}d left`
        : subscription?.status === 'active'
        ? 'Active'
        : subscription?.status === 'past_due'
        ? 'Payment Failed'
        : 'Free',
      onPress: () => router.push('/subscription' as any),
    },
    {
      icon: Bell,
      label: 'Notifications',
      value: 'On',
      onPress: () => router.push('/notifications' as any),
    },
    {
      icon: Shield,
      label: 'Privacy & Security',
      value: '',
      onPress: () => router.push('/privacy-security' as any),
    },
    {
      icon: Settings,
      label: 'Settings',
      value: '',
      onPress: () => router.push('/settings' as any),
    },
  ];

  const handleSignOut = () => {
    const doSignOut = async () => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await signOut();
      router.replace('/(tabs)/home' as any);
    };

    // Alert.alert button callbacks don't fire on web — use window.confirm instead
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        doSignOut();
      }
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]
    );
  };

  const handleScannerPress = () => {
    if (user?.role === 'clubAdmin' || user?.role === 'superAdmin') {
      router.push('/scanner' as any);
    } else {
      Alert.alert('Admin Only', 'Scanner is only available for club admins');
    }
  };

  const handleAdminPress = () => {
    if (user?.role === 'clubAdmin' || user?.role === 'superAdmin') {
      router.push('/admin' as any);
    } else {
      Alert.alert('Admin Only', 'Dashboard is only available for club admins');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          {user?.avatarUrl && user.avatarUrl.trim() !== '' ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.ageVerified && (
              <View style={styles.verifiedBadge}>
                <Shield size={12} color={theme.colors.success} />
                <Text style={styles.verifiedText}>Age Verified</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/edit-profile' as any)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Pending business approval banner */}
      {businessStatus === 'pending' && (
        <View style={{
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.md,
          backgroundColor: 'rgba(124, 58, 237, 0.12)',
          borderWidth: 1,
          borderColor: 'rgba(124, 58, 237, 0.35)',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing.sm,
        }}>
          <Clock size={18} color={theme.colors.purple} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.purple, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
              Business Approval Pending
            </Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13, lineHeight: 18 }}>
              Your business registration is under review. You'll gain access to the business dashboard once approved by the Tipzy team.
            </Text>
          </View>
        </View>
      )}

      {/* Switch to Business Dashboard — shown when user has an approved business */}
      {isBusiness && (
        <TouchableOpacity
          style={styles.switchViewButton}
          onPress={() => router.replace('/(business-tabs)/dashboard' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.switchViewLeft}>
            <View style={styles.switchViewIconWrap}>
              <Building2 size={22} color={theme.colors.white} />
            </View>
            <View>
              <Text style={styles.switchViewTitle}>Switch to Business View</Text>
              <Text style={styles.switchViewSub}>Manage your venue & dashboard</Text>
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.white} />
        </TouchableOpacity>
      )}

      {(user?.role === 'clubAdmin' || user?.role === 'superAdmin') && (
        <View style={styles.adminSection}>
          <TouchableOpacity style={styles.adminButton} onPress={handleScannerPress}>
            <QrCode size={20} color={theme.colors.white} />
            <Text style={styles.adminButtonText}>QR Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminButton} onPress={handleAdminPress}>
            <Settings size={20} color={theme.colors.white} />
            <Text style={styles.adminButtonText}>Admin Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.menu}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={`menu-item-${item.label}`}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Icon size={20} color={theme.colors.text.secondary} />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.value ? (
                  <Text style={styles.menuItemValue}>{item.value}</Text>
                ) : null}
                <ChevronRight size={20} color={theme.colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color={theme.colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}