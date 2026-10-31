import { config } from '../config';
import type { SeatSnapshot } from '../types';
import { buildSnapshot, parseSeatsResponse } from '../lib/seatUtils';

export async function fetchSeatSnapshot(
  signal?: AbortSignal,
  url: string = config.seatApiUrl
): Promise<SeatSnapshot> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Seat API returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const seats = parseSeatsResponse(payload);
  return buildSnapshot(seats, Date.now());
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = config.requestTimeoutMs
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
