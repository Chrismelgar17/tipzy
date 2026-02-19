import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Bell, Smartphone, Mail, MessageSquare } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { NotificationSettings } from '@/types/models';

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    inAppNotifications: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Here you would typically save to your backend or AsyncStorage
    Alert.alert('Success', 'Notification settings saved successfully');
    setHasChanges(false);
  };

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
                  <Switch
                    value={settings[option.key]}
                    onValueChange={() => handleToggle(option.key)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.purple + '40',
                    }}
                    thumbColor={settings[option.key] ? theme.colors.purple : theme.colors.text.tertiary}
                  />
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

        {hasChanges && (
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});