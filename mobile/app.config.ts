import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const DEFAULT_SEAT_API_URL =
  'https://v1.nitj.ac.in/erp/library_seating/api.php?action=get-seats';
const DEFAULT_EAS_PROJECT_ID = '9fb118d2-87a0-4637-ba86-567f5dcb5fd6';

export default ({ config }: ConfigContext): ExpoConfig => {
  const seatApiUrl =
    process.env.EXPO_PUBLIC_SEAT_API_URL?.trim() || DEFAULT_SEAT_API_URL;
  const relayUrl = process.env.EXPO_PUBLIC_PUSH_RELAY_URL?.trim() ?? '';
  const usesCleartextTraffic =
    seatApiUrl.startsWith('http://') || relayUrl.startsWith('http://');
  const easProjectId =
    process.env.EAS_PROJECT_ID?.trim() || DEFAULT_EAS_PROJECT_ID;
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON?.trim() ||
    (existsSync('./google-services.json')
      ? './google-services.json'
      : undefined);

  return {
    ...config,
    name: 'Library Seats',
    slug: 'library-seats',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'libraryseats',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.joel.libraryseats',
    },
    android: {
      package: 'com.joel.libraryseats',
      adaptiveIcon: {
        backgroundColor: '#F6F5F2',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['POST_NOTIFICATIONS'],
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic,
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: '#16a34a',
          defaultChannel: 'seat-availability-v2',
        },
      ],
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'SeatWidget',
              label: 'Library Seats',
              description:
                'Live seat availability at the NITJ library, updated every 30 minutes.',
              minWidth: '250dp',
              minHeight: '110dp',
              targetCellWidth: 4,
              targetCellHeight: 2,
              maxResizeWidth: '320dp',
              maxResizeHeight: '160dp',
              resizeMode: 'horizontal|vertical',
              updatePeriodMillis: 1800000,
            },
          ],
        },
      ],
    ],
    extra: {
      seatApiUrl,
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
  };
};
