const DEFAULT_SEAT_API_URL =
  'https://v1.nitj.ac.in/erp/library_seating/api.php?action=get-seats';

function parseInterval(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return fallback;
  }
  return parsed;
}

export const config = {
  seatApiUrl: process.env.EXPO_PUBLIC_SEAT_API_URL?.trim() || DEFAULT_SEAT_API_URL,
  pollIntervalMs: parseInterval(
    process.env.EXPO_PUBLIC_POLL_INTERVAL_MS,
    5000
  ),
  requestTimeoutMs: 8000,
  pushRelayUrl: (process.env.EXPO_PUBLIC_PUSH_RELAY_URL ?? '')
    .trim()
    .replace(/\/+$/, ''),
};

export const ALL_FLOORS = ['G', '1', '2', '3'];
