import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';
import { getToken } from '@/utils/tokenStorage';

let Notifications: any = null;
try {
  // expo-notifications crashes in Expo Go on Android SDK 53+ — skip it there.
  // iOS (Expo Go and standalone builds) works fine.
  if (Platform.OS !== 'android') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.warn('[Notifications] expo-notifications not available:', e);
}

export async function registerForPushNotifications(): Promise<void> {
  try {
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

    // getExpoPushTokenAsync returns an "ExponentPushToken[...]" that works in
    // Expo Go on both iOS and Android. Expo's servers handle APNs/FCM delivery.
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
    // Expected on iOS Simulator — push notifications are not supported there
    console.log('[Notifications] Could not register push token:', error);
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
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
