import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SeatSnapshot } from '../types';

const SNAPSHOT_KEY = 'library-seats/snapshot-v1';

function isValidSnapshot(value: unknown): value is SeatSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const snapshot = value as Partial<SeatSnapshot>;
  return (
    Array.isArray(snapshot.seats) &&
    Array.isArray(snapshot.groups) &&
    typeof snapshot.fetchedAt === 'number' &&
    typeof snapshot.summary === 'object' &&
    snapshot.summary !== null
  );
}

export async function loadSnapshot(): Promise<SeatSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: SeatSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // The widget and screen can continue with in-memory data.
  }
}
