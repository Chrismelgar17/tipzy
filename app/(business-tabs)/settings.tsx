import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import { 
  Bell,
  Lock,
  FileText,
  Shield,
  Mail,
  Star,
  LogOut,
  ChevronRight,
  Settings as SettingsIcon,
  Building,
} from 'lucide-react-native';

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  type: 'toggle' | 'link' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  testId?: string;
}

export default function BusinessSettingsScreen() {
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/signin' as any);
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  const handleContactUs = () => {
    Linking.openURL('mailto:support@nightlife.com?subject=Business Support');
  };

  const handleRateApp = () => {
    // In a real app, this would open the app store
    Linking.openURL('https://apps.apple.com/app/nightlife');
  };

  const handleTerms = () => {
    Linking.openURL('https://nightlife.com/terms');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://nightlife.com/privacy');
  };

  const handleBusinessProfile = () => {
    router.push('/business-profile');
  };

  const settingsSections = [
    {
      title: 'Profile & Account',
      items: [
        {
          id: 'business-profile',
          title: 'Business Profile',
          description: 'Edit your business details, photos, and hours',
          icon: <Building size={24} color={theme.colors.purple} />,
          type: 'link' as const,
          onPress: handleBusinessProfile,
          testId: 'business-profile-button',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Notifications',
          description: 'Receive push notifications for new orders and updates',
          icon: <Bell size={24} color={theme.colors.purple} />,
          type: 'toggle' as const,
          value: notifications,
          onToggle: setNotifications,
          testId: 'notifications-toggle',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'change-password',
          title: 'Change Password',
          description: 'Update your account password',
          icon: <Lock size={24} color={theme.colors.cyan} />,
          type: 'link' as const,
          onPress: handleChangePassword,
          testId: 'change-password-button',
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          id: 'terms',
          title: 'Terms & Conditions',
          description: 'Read our terms of service',
          icon: <FileText size={24} color={theme.colors.success} />,
          type: 'link' as const,
          onPress: handleTerms,
          testId: 'terms-button',
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          description: 'Learn about our privacy practices',
          icon: <Shield size={24} color={theme.colors.warning} />,
          type: 'link' as const,
          onPress: handlePrivacy,
          testId: 'privacy-button',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'contact',
          title: 'Contact Us',
          description: 'Get help from our support team',
          icon: <Mail size={24} color={theme.colors.purple} />,
          type: 'link' as const,
          onPress: handleContactUs,
          testId: 'contact-button',
        },
        {
          id: 'rate',
          title: 'Rate App',
          description: 'Help us improve by rating the app',
          icon: <Star size={24} color={theme.colors.warning} />,
          type: 'link' as const,
          onPress: handleRateApp,
          testId: 'rate-app-button',
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    if (item.type === 'toggle') {
      return (
        <View key={item.id} style={styles.settingItem} testID={item.testId}>
          <View style={styles.settingIcon}>
            {item.icon}
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.settingDescription}>{item.description}</Text>
            )}
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{
              false: theme.colors.border,
              true: `${theme.colors.purple}50`,
            }}
            thumbColor={item.value ? theme.colors.purple : theme.colors.text.tertiary}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        onPress={item.onPress}
        testID={item.testId}
      >
        <View style={styles.settingIcon}>
          {item.icon}
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.settingDescription}>{item.description}</Text>
          )}
        </View>
        <ChevronRight size={20} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    headerSection: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    headerIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.colors.purple}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
    },
    sectionContent: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    logoutSection: {
      marginTop: theme.spacing.xl,
    },
    logoutButton: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    logoutIcon: {
      marginRight: theme.spacing.md,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.error,
    },
    versionInfo: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    versionText: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <SettingsIcon size={40} color={theme.colors.purple} />
            </View>
            <Text style={styles.headerTitle}>Business Settings</Text>
            <Text style={styles.headerSubtitle}>
              Manage your business account preferences and settings
            </Text>
          </View>

          {settingsSections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionContent}>
                {section.items.map((item, index) => (
                  <View key={item.id}>
                    {renderSettingItem(item)}
                    {index < section.items.length - 1 && (
                      <View style={{ borderBottomWidth: 0 }} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
              testID="logout-button"
            >
              <View style={styles.logoutIcon}>
                <LogOut size={24} color={theme.colors.error} />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}