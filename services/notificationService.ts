import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import { API_BASE_URL } from './config';
import { getToken } from '@/utils/tokenStorage';

export function getNotificationsModule() {
  try {
    return require('expo-notifications');
  } catch (error) {
    console.warn('[Notifications] expo-notifications not available:', error);
    return null;
  }
}

export async function registerForPushNotifications(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    // Remote push notifications via Expo push service are not supported in Expo Go (SDK 53+)
    // Local notifications continue to work normally.
    const isExpoGo =
      Constants.appOwnership === 'expo' ||
      (Constants as any).executionEnvironment === 'storeClient';
    if (isExpoGo) {
      return;
    }
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

    const isExpoGo =
      Constants.appOwnership === 'expo' ||
      (Constants as any).executionEnvironment === 'storeClient';
    if (isExpoGo) {
      return;
    }

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
