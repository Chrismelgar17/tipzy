import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Bell, Smartphone, Mail, MessageSquare } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { NotificationSettings } from '@/types/models';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  registerForPushNotifications,
  unregisterPushToken,
} from '@/lib/notifications';

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: false,
    emailNotifications: true,
    inAppNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadNotificationSettings()
      .then((saved) => setSettings(saved))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (key: keyof NotificationSettings) => {
    if (key === 'pushNotifications') {
      const newValue = !settings.pushNotifications;
      if (newValue) {
        // Request permission and register token
        setSaving(true);
        try {
          const token = await registerForPushNotifications();
          if (token) {
            const updated = { ...settings, pushNotifications: true };
            setSettings(updated);
            await saveNotificationSettings(updated);
            setHasChanges(false);
          } else {
            Alert.alert(
              'Permission Required',
              'To receive push notifications, please allow notifications in your device settings.',
              [{ text: 'OK' }],
            );
          }
        } catch (err: any) {
          Alert.alert('Error', err?.message ?? 'Failed to enable push notifications');
        } finally {
          setSaving(false);
        }
      } else {
        // Unregister token
        setSaving(true);
        try {
          await unregisterPushToken();
          const updated = { ...settings, pushNotifications: false };
          setSettings(updated);
          await saveNotificationSettings(updated);
          setHasChanges(false);
        } catch {
          // Still update local state even if backend call fails
          const updated = { ...settings, pushNotifications: false };
          setSettings(updated);
          await saveNotificationSettings(updated);
          setHasChanges(false);
        } finally {
          setSaving(false);
        }
      }
    } else {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
      setHasChanges(true);
    }
  }, [settings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveNotificationSettings(settings);
      setHasChanges(false);
      Alert.alert('Saved', 'Notification settings saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const notificationOptions = [
    {
      key: 'pushNotifications' as keyof NotificationSettings,
      title: 'Push Notifications',
      description: 'Receive notifications on your device',
      icon: Smartphone,
    },
    {
      key: 'emailNotifications' as keyof NotificationSettings,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: Mail,
    },
    {
      key: 'inAppNotifications' as keyof NotificationSettings,
      title: 'In-App Notifications',
      description: 'Show notifications within the app',
      icon: MessageSquare,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.purple} />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Bell size={32} color={theme.colors.purple} />
              <Text style={styles.headerTitle}>Notification Preferences</Text>
              <Text style={styles.headerDescription}>
                Choose how you want to be notified about events, updates, and promotions.
              </Text>
            </View>

            <View style={styles.optionsList}>
              {notificationOptions.map((option) => {
                const Icon = option.icon;
                const isDisabled = saving && option.key === 'pushNotifications';
                return (
                  <View key={option.key} style={styles.optionItem}>
                    <View style={styles.optionLeft}>
                      <View style={styles.iconContainer}>
                        <Icon size={20} color={theme.colors.purple} />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>{option.title}</Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      </View>
                    </View>
                    {isDisabled ? (
                      <ActivityIndicator size="small" color={theme.colors.purple} />
                    ) : (
                      <Switch
                        value={settings[option.key]}
                        onValueChange={() => handleToggle(option.key)}
                        disabled={saving}
                        trackColor={{
                          false: theme.colors.border,
                          true: theme.colors.purple + '40',
                        }}
                        thumbColor={settings[option.key] ? theme.colors.purple : theme.colors.text.tertiary}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>About Notifications</Text>
              <Text style={styles.infoText}>
                • Push notifications require device permissions{'\n'}
                • Email notifications are sent to your registered email{'\n'}
                • In-app notifications appear while using the app{'\n'}
                • You can change these settings anytime
              </Text>
            </View>
          </ScrollView>
        )}

        {hasChanges && !loading && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  headerDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  infoSection: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.purple,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  saveContainer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    backgroundColor: theme.colors.purple,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
