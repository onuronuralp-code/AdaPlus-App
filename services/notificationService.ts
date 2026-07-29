import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import { API_BASE_URL } from './config';
import { getToken } from '@/utils/tokenStorage';

function getNotificationsModule() {
  try {
    // Expo Go does not include legacy PushNotificationIOS / RCTPushNotificationManager native modules.
    // Requiring expo-notifications in Expo Go or simulator without native build throws an Invariant Violation.
    const isExpoGo =
      Constants.appOwnership === 'expo' ||
      (Constants as any).executionEnvironment === 'storeClient' ||
      !!(Constants as any).expoVersion ||
      !!(Constants as any).manifest ||
      !NativeModules.PushNotificationManager;

    if (isExpoGo) {
      return null;
    }
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export async function registerForPushNotifications(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied');
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? 'f842f1f6-7573-43a1-a1a9-58b9e270eff6';
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform: 'IOS' | 'ANDROID' = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

    const authToken = getToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/users/device-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ token: tokenData.data, platform }),
    });

    if (res.ok) {
      console.log('[Notifications] Device token registered');
    } else {
      console.warn('[Notifications] Token registration failed:', res.status);
    }
  } catch (error) {
    console.log('[Notifications] Could not register push token:', error);
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? 'f842f1f6-7573-43a1-a1a9-58b9e270eff6';
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const authToken = getToken();
    await fetch(
      `${API_BASE_URL}/api/v1/users/device-tokens?token=${encodeURIComponent(tokenData.data)}`,
      {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      },
    );
  } catch {
    // Ignore — unavailable
  }
}
