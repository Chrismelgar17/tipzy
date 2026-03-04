import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const SETTINGS_KEY = 'notification_settings';

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushNotifications: true,
  emailNotifications: true,
  inAppNotifications: true,
};

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Load saved notification settings from AsyncStorage */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

/** Save notification settings to AsyncStorage */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Request push notification permission and register push token with backend */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Push notifications not supported on web');
    return null;
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    // Save token to backend so server can send push notifications
    await api.post('/customer/push-token', { token }).catch(() => {});
    return token;
  } catch (e) {
    console.warn('[Notifications] Failed to get push token:', e);
    return null;
  }
}

/** Remove push token from backend (when user disables push notifications) */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete('/customer/push-token').catch(() => {});
  } catch {}
}
