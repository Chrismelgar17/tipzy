import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/api';
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
  Building2,
  Users,
  CreditCard,
  Trash2,
  HelpCircle,
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
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/signin' as any);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your business account? This will remove all your venues, orders, and data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/business/account');
              await AsyncStorage.removeItem('businessProfile');
              router.replace('/(auth)/signin' as any);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error ?? 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  const handleContactUs = () => {
    setShowHelpModal(true);
  };

  const handleRateApp = () => {
    // In a real app, this would open the app store
    Linking.openURL('https://apps.apple.com/app/nightlife');
  };

  const handleTerms = () => {
    router.push('/terms-conditions' as any);
  };

  const handlePrivacy = () => {
    router.push('/privacy-policy' as any);
  };

  const handleBusinessProfile = () => {
    router.push('/business-profile');
  };

  // const handleAddVenue = () => {
  //   router.push('/add-venue' as any);
  // };

  const handleSubscription = () => {
    router.push('/(business-tabs)/subscription' as any);
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
        {
          id: 'subscription',
          title: 'Plan & Subscription',
          description: 'Manage your Tipzy plan, trial, and billing',
          icon: <CreditCard size={24} color={theme.colors.success} />,
          type: 'link' as const,
          onPress: handleSubscription,
          testId: 'subscription-button',
        },
        // {
        //   id: 'add-venue',
        //   title: 'Add New Venue',
        //   description: 'Register an additional bar or club under your account',
        //   icon: <Building2 size={24} color={theme.colors.purple} />,
        //   type: 'link' as const,
        //   onPress: handleAddVenue,
        //   testId: 'add-venue-button',
        // },
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
          title: 'Help & Support',
          description: 'FAQs and contact our support team',
          icon: <HelpCircle size={24} color={theme.colors.purple} />,
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
    switchViewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.purple,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xl,
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
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },
    switchViewSub: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      marginTop: 2,
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
    deleteaccountButton: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error,
      marginTop: theme.spacing.md,
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
    <>
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

          {/* Switch to Customer View */}
          <TouchableOpacity
            style={styles.switchViewButton}
            onPress={() => router.replace('/(tabs)/home' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.switchViewLeft}>
              <View style={styles.switchViewIconWrap}>
                <Users size={22} color={theme.colors.white} />
              </View>
              <View>
                <Text style={styles.switchViewTitle}>Switch to Customer View</Text>
                <Text style={styles.switchViewSub}>Browse venues & manage your tickets</Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.white} />
          </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.deleteaccountButton}
              onPress={handleDeleteAccount}
              testID="delete-account-button"
            >
              <View style={styles.logoutIcon}>
                <Trash2 size={24} color={theme.colors.error} />
              </View>
              <Text style={styles.logoutText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={helpStyles.container}>
          <View style={helpStyles.header}>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <Text style={helpStyles.doneBtn}>Done</Text>
            </TouchableOpacity>
            <Text style={helpStyles.title}>Help & Support</Text>
            <View style={{ width: 48 }} />
          </View>

          <ScrollView>
            <View style={helpStyles.section}>
              <Text style={helpStyles.sectionTitle}>Frequently Asked Questions</Text>

              <View style={helpStyles.faqItem}>
                <Text style={helpStyles.faqQ}>How do I update my venue photos?</Text>
                <Text style={helpStyles.faqA}>Go to Business Profile and tap Edit Profile. You can upload new photos or remove existing ones.</Text>
              </View>
              <View style={helpStyles.faqItem}>
                <Text style={helpStyles.faqQ}>How do subscriptions work?</Text>
                <Text style={helpStyles.faqA}>Choose a plan in Plan & Subscription. Your plan unlocks ticket sales, event creation, and analytics.</Text>
              </View>
              <View style={helpStyles.faqItem}>
                <Text style={helpStyles.faqQ}>How do I track orders?</Text>
                <Text style={helpStyles.faqA}>All ticket purchases are visible in the Orders tab with real-time status updates.</Text>
              </View>
              <View style={helpStyles.faqItem}>
                <Text style={helpStyles.faqQ}>How do I update the live crowd level?</Text>
                <Text style={helpStyles.faqA}>Use the capacity controls on your Dashboard to increase or decrease the current guest count.</Text>
              </View>
              <View style={helpStyles.faqItem}>
                <Text style={helpStyles.faqQ}>How do I cancel my subscription?</Text>
                <Text style={helpStyles.faqA}>Contact our support team at tipzy.team@gmail.com to cancel or modify your plan.</Text>
              </View>
            </View>

            <View style={helpStyles.section}>
              <Text style={helpStyles.sectionTitle}>Contact Support</Text>
              <Text style={helpStyles.body}>If you need additional help, reach our support team:</Text>
              <Text style={helpStyles.detail}>📧 tipzy.team@gmail.com</Text>
              <Text style={helpStyles.detail}>🕒 Mon – Fri, 9 AM – 6 PM EST</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const helpStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  doneBtn: {
    fontSize: 17,
    color: '#8b5cf6',
    fontWeight: '500',
    width: 48,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQ: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  faqA: {
    fontSize: 14,
    color: '#aaaaaa',
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    color: '#aaaaaa',
    marginBottom: 12,
  },
  detail: {
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 6,
  },
});