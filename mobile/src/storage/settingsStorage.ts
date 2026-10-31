import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_FLOORS } from '../config';
import type { NotificationSettings } from '../types';

const SETTINGS_KEY = 'library-seats/notification-settings-v1';

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  floors: [...ALL_FLOORS],
};

function normalizeSettings(value: unknown): NotificationSettings {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = value as Partial<NotificationSettings>;
  const floors = Array.isArray(candidate.floors)
    ? candidate.floors.filter(
        (floor): floor is string =>
          typeof floor === 'string' && ALL_FLOORS.includes(floor)
      )
    : [];

  return {
    enabled: candidate.enabled === true,
    floors: floors.length > 0 ? floors : [...ALL_FLOORS],
  };
}

export async function loadSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  settings: NotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The in-memory settings still apply for this session.
  }
}
