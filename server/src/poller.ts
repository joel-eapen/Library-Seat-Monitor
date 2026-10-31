import { seatsForSubscription } from './notifications.js';
import { parseSeatsPayload, toSeatMap } from './seats.js';
import {
  areAllSeatsUnoccupied,
  detectFreedSeats,
  isSeatMapAllUnoccupied,
} from './transitions.js';
import type { StateRepository } from './stateStore.js';
import type { SubscriptionStore } from './subscriptions.js';
import type { PushDispatcher } from './dispatcher.js';
import type { PollSnapshot, PollStatus, Seat } from './types.js';

type SeatFetcher = (signal?: AbortSignal) => Promise<Seat[]>;

type PollerOptions = {
  seatApiUrl: string;
  intervalMs: number;
  requestTimeoutMs: number;
  stateStaleMs: number;
  stateSaveIntervalMs: number;
  state: StateRepository;
  subscriptions: SubscriptionStore;
  dispatcher: PushDispatcher;
  fetchSeats?: SeatFetcher;
};

function hasSeatChanges(
  previous: Record<string, boolean>,
  current: Record<string, boolean>
): boolean {
  const previousKeys = Object.keys(previous);
  const currentKeys = Object.keys(current);
  if (previousKeys.length !== currentKeys.length) {
    return true;
  }
  return currentKeys.some((key) => previous[key] !== current[key]);
}

async function fetchSeatsFromApi(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<Seat[]> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Seat API returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return parseSeatsPayload(payload);
}

export class SeatPoller {
  private readonly options: PollerOptions;
  private readonly fetchSeats: SeatFetcher;
  private previousSnapshot: PollSnapshot | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastSavedAt = 0;
  private status: PollStatus = {
    ok: false,
    lastSuccessAt: null,
    lastError: null,
    seatCount: null,
    lastFreedCount: 0,
    libraryClosed: false,
  };

  constructor(options: PollerOptions) {
    this.options = options;
    this.fetchSeats =
      options.fetchSeats ??
      ((signal) =>
        fetchSeatsFromApi(
          options.seatApiUrl,
          options.requestTimeoutMs,
          signal
        ));
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    const stored = await this.options.state.load();
    if (
      stored &&
      Date.now() - stored.fetchedAt <= this.options.stateStaleMs
    ) {
      this.previousSnapshot = stored;
      this.lastSavedAt = stored.fetchedAt;
    }

    await this.runOnce();
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getStatus(): PollStatus {
    return { ...this.status };
  }

  async runOnce(): Promise<PollStatus> {
    const fetchedAt = Date.now();

    try {
      const seats = await this.fetchSeats();
      if (seats.length === 0) {
        throw new Error('Seat API returned no seats');
      }

      const previous = this.previousSnapshot;
      const allUnoccupied = areAllSeatsUnoccupied(seats);
      const libraryJustClosed =
        previous !== null &&
        allUnoccupied &&
        !isSeatMapAllUnoccupied(previous.seats);
      const freed = libraryJustClosed
        ? []
        : detectFreedSeats(previous?.seats ?? null, seats);
      this.status = {
        ok: true,
        lastSuccessAt: fetchedAt,
        lastError: null,
        seatCount: seats.length,
        lastFreedCount: freed.length,
        libraryClosed: allUnoccupied,
      };

      if (libraryJustClosed) {
        const subscriptions = this.options.subscriptions.list();
        await this.options.dispatcher.notifyLibraryClosed(
          subscriptions.map((subscription) => subscription.token)
        );
      } else if (freed.length > 0) {
        const subscriptions = this.options.subscriptions.list();
        await Promise.all(
          subscriptions.map((subscription) => {
            const relevant = seatsForSubscription(freed, subscription);
            return this.options.dispatcher.enqueue(
              subscription.token,
              relevant
            );
          })
        );
      }

      const currentSeats = toSeatMap(seats);
      const changed =
        !previous || hasSeatChanges(previous.seats, currentSeats);
      const shouldSave =
        changed ||
        fetchedAt - this.lastSavedAt >= this.options.stateSaveIntervalMs;

      this.previousSnapshot = { seats: currentSeats, fetchedAt };

      if (shouldSave) {
        this.lastSavedAt = fetchedAt;
        await this.options.state.save(this.previousSnapshot);
      }
    } catch (error) {
      this.status = {
        ...this.status,
        ok: false,
        lastError:
          error instanceof Error ? error.message : 'Unknown polling error',
        lastFreedCount: 0,
      };
    }

    return this.getStatus();
  }

  private scheduleNext(): void {
    if (!this.running) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.runOnce()
        .catch((error) => {
          console.error('Unexpected polling failure:', error);
        })
        .finally(() => this.scheduleNext());
    }, this.options.intervalMs);
  }
}
