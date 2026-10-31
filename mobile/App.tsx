import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { ALL_FLOORS } from './src/config';
import {
  addNotificationResponseListener,
  clearLastNotificationPayload,
  ensureNotificationChannel,
  getExpoPushToken,
  getLastNotificationPayload,
  getNotificationPayload,
  requestNotificationPermission,
  scheduleLocalTestNotification,
} from './src/notifications/notificationService';
import {
  isPushRelayConfigured,
  registerPushSubscription,
  sendTestPushNotification,
  unregisterPushSubscription,
} from './src/push/pushRegistration';
import { LiveSeatsScreen } from './src/screens/LiveSeatsScreen';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from './src/storage/settingsStorage';
import { colors } from './src/theme';
import type {
  NotificationPayload,
  NotificationSettings,
  PushStatus,
} from './src/types';

const EMPTY_SEATS: string[] = [];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export default function App() {
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>('disabled');
  const [focus, setFocus] = useState<{
    floor: string;
    seats: string[];
  } | null>(null);
  const pushTokenRef = useRef<string | null>(null);
  const pushQueueRef = useRef<Promise<void>>(Promise.resolve());

  const runPushTask = useCallback((task: () => Promise<void>) => {
    pushQueueRef.current = pushQueueRef.current
      .then(task)
      .catch(() => {
        // Individual tasks report their own errors.
      });
    return pushQueueRef.current;
  }, []);

  const applyNotificationPayload = useCallback(
    (payload: NotificationPayload | null) => {
      if (!payload?.floor || !ALL_FLOORS.includes(payload.floor)) {
        return;
      }
      const seats = (payload.seats ?? '')
        .split(',')
        .map((seat) => seat.trim())
        .filter(Boolean);
      setFocus({ floor: payload.floor, seats });
    },
    []
  );

  const activateNotifications = useCallback(
    async (
      next: NotificationSettings,
      options: { silent?: boolean } = {}
    ) => {
      if (!isPushRelayConfigured()) {
        setPushStatus('error');
        return;
      }

      setPushStatus('registering');
      try {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setPushStatus('error');
          if (!options.silent) {
            Alert.alert(
              'Notifications are blocked',
              'Allow notifications for this app in Android settings, then try again.'
            );
          }
          return;
        }

        const token =
          pushTokenRef.current ?? (await getExpoPushToken());
        pushTokenRef.current = token;
        await registerPushSubscription(token, next.floors);
        setPushStatus('registered');
      } catch (error) {
        setPushStatus('error');
        if (!options.silent) {
          Alert.alert('Could not enable alerts', errorMessage(error));
        }
      }
    },
    []
  );

  const handleChangeSettings = useCallback(
    async (next: NotificationSettings) => {
      setSettings(next);
      void saveSettings(next);

      if (!next.enabled) {
        await runPushTask(async () => {
          setPushStatus('disabled');
          const token = pushTokenRef.current;
          if (!token) {
            return;
          }
          try {
            await unregisterPushSubscription(token);
          } catch {
            // The relay may already be unreachable; local state is enough.
          }
        });
        return;
      }

      await runPushTask(() => activateNotifications(next));
    },
    [activateNotifications, runPushTask]
  );

  const handleTestNotification = useCallback(async () => {
    try {
      if (
        pushStatus === 'registered' &&
        pushTokenRef.current &&
        isPushRelayConfigured()
      ) {
        await sendTestPushNotification(pushTokenRef.current);
        Alert.alert(
          'Test push sent',
          'You should see it shortly. Background the app to test background delivery.'
        );
        return;
      }

      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are blocked',
          'Allow notifications for this app in Android settings, then try again.'
        );
        return;
      }
      await scheduleLocalTestNotification();
      Alert.alert(
        'Test notification scheduled',
        'It will appear in 4 seconds. Background the app now to test background delivery.'
      );
    } catch (error) {
      Alert.alert('Test failed', errorMessage(error));
    }
  }, [pushStatus]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await ensureNotificationChannel();
      } catch {
        // Channel setup is retried when the user enables alerts.
      }

      const loaded = await loadSettings();
      if (!mounted) {
        return;
      }
      setSettings(loaded);
      setSettingsLoaded(true);

      if (loaded.enabled) {
        void runPushTask(() =>
          activateNotifications(loaded, { silent: true })
        );
      } else {
        setPushStatus('disabled');
      }

      try {
        const lastPayload = await getLastNotificationPayload();
        if (mounted && lastPayload) {
          applyNotificationPayload(lastPayload);
        }
        await clearLastNotificationPayload();
      } catch {
        // Opening from a notification is best-effort.
      }
    };

    void bootstrap();

    const subscription = addNotificationResponseListener((response) => {
      applyNotificationPayload(getNotificationPayload(response));
      void clearLastNotificationPayload().catch(() => {
        // The response is still handled in memory.
      });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [activateNotifications, applyNotificationPayload, runPushTask]);

  const handleFocusConsumed = useCallback(() => setFocus(null), []);

  if (!settingsLoaded) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={styles.safe}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <LiveSeatsScreen
          settings={settings}
          pushStatus={pushStatus}
          relayConfigured={isPushRelayConfigured()}
          onChangeSettings={handleChangeSettings}
          onTestNotification={handleTestNotification}
          focusFloor={focus?.floor ?? null}
          focusSeats={focus?.seats ?? EMPTY_SEATS}
          onFocusConsumed={handleFocusConsumed}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
