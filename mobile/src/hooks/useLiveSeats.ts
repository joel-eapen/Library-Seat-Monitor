import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchSeatSnapshot } from '../api/seatApi';
import { config } from '../config';
import { loadSnapshot, saveSnapshot } from '../storage/snapshotStorage';
import type { LiveStatus, SeatSnapshot } from '../types';

const SNAPSHOT_SAVE_INTERVAL_MS = 60000;

function snapshotSignature(snapshot: SeatSnapshot): string {
  return snapshot.groups
    .map((group) => `${group.key}:${group.available}/${group.total}`)
    .join('|');
}

export function useLiveSeats(): {
  snapshot: SeatSnapshot | null;
  status: LiveStatus;
  error: string | null;
  refresh: () => void;
} {
  const [snapshot, setSnapshot] = useState<SeatSnapshot | null>(null);
  const [status, setStatus] = useState<LiveStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isActive, setIsActive] = useState(
    AppState.currentState === 'active'
  );
  const snapshotRef = useRef<SeatSnapshot | null>(null);
  const failuresRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const lastSavedSignatureRef = useRef('');

  useEffect(() => {
    let mounted = true;
    loadSnapshot().then((cached) => {
      if (!mounted || !cached || snapshotRef.current) {
        return;
      }
      snapshotRef.current = cached;
      lastSavedAtRef.current = cached.fetchedAt;
      lastSavedSignatureRef.current = snapshotSignature(cached);
      setSnapshot(cached);
      setStatus('stale');
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const run = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => {
        controller?.abort();
      }, config.requestTimeoutMs);

      try {
        const next = await fetchSeatSnapshot(controller.signal);
        if (cancelled) {
          return;
        }

        const signature = snapshotSignature(next);
        const shouldSave =
          signature !== lastSavedSignatureRef.current ||
          Date.now() - lastSavedAtRef.current >=
            SNAPSHOT_SAVE_INTERVAL_MS;

        snapshotRef.current = next;
        failuresRef.current = 0;
        setSnapshot(next);
        setStatus('live');
        setError(null);

        if (shouldSave) {
          lastSavedAtRef.current = Date.now();
          lastSavedSignatureRef.current = signature;
          void saveSnapshot(next);
        }

        timer = setTimeout(run, config.pollIntervalMs);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        failuresRef.current += 1;
        const message =
          fetchError instanceof Error && fetchError.name === 'AbortError'
            ? 'Request timed out'
            : fetchError instanceof Error
              ? fetchError.message
              : 'Unable to reach the seat API';
        setError(message);
        setStatus(snapshotRef.current ? 'stale' : 'error');

        const delay =
          Math.min(30000, 2000 * 2 ** (failuresRef.current - 1)) +
          Math.floor(Math.random() * 500);
        timer = setTimeout(run, delay);
      } finally {
        clearTimeout(timeout);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      controller?.abort();
    };
  }, [isActive, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return { snapshot, status, error, refresh };
}
