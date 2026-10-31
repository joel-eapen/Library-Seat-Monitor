import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPayload } from '../types';

export const NOTIFICATION_CHANNEL_ID = 'seat-availability-v2';
const LEGACY_NOTIFICATION_CHANNEL_ID = 'seat-availability';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isTest = notification.request.content.data?.type === 'test';
    return {
      shouldShowBanner: isTest,
      shouldShowList: isTest,
      shouldPlaySound: isTest,
      shouldSetBadge: false,
    };
  },
});

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.deleteNotificationChannelAsync(
    LEGACY_NOTIFICATION_CHANNEL_ID
  );
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Seat availability',
    description: 'Alerts when a seat becomes available',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16a34a',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getExpoPushToken(): Promise<string> {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const projectId =
    extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

  if (!projectId) {
    throw new Error(
      'Missing EAS projectId. Run `eas init` and rebuild the development client.'
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function scheduleLocalTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Library seat alerts are working',
      body: 'This is a local test notification.',
      sound: 'default',
      data: { type: 'test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 4,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

export function getNotificationPayload(
  response: Notifications.NotificationResponse | null
): NotificationPayload | null {
  if (!response) {
    return null;
  }
  const data = response.notification.request.content.data;
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  return data as NotificationPayload;
}

export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export function addForegroundNotificationListener(
  listener: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(listener);
}

export async function getLastNotificationPayload(): Promise<NotificationPayload | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) {
    return null;
  }
  return getNotificationPayload(response);
}

export async function clearLastNotificationPayload(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync();
}
