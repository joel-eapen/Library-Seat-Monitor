import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PushDispatcher } from '../src/dispatcher.js';
import { SeatPoller } from '../src/poller.js';
import type { StateRepository } from '../src/stateStore.js';
import { SubscriptionStore } from '../src/subscriptions.js';
import type {
  PollSnapshot,
  PushMessage,
  PushSendResult,
  PushSender,
  Seat,
} from '../src/types.js';

class MemoryState implements StateRepository {
  snapshot: PollSnapshot | null = null;

  async load(): Promise<PollSnapshot | null> {
    return this.snapshot;
  }

  async save(snapshot: PollSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }
}

class RecordingSender implements PushSender {
  readonly calls: PushMessage[][] = [];

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    this.calls.push(messages);
    return { invalidTokens: [] };
  }
}

function seat(
  id: string,
  floor: string,
  number: number,
  occupied: boolean
): Seat {
  return { id, floor, number, occupied };
}

const directories: string[] = [];
const token = 'ExpoPushToken[test]';

async function createSubscriptions() {
  const directory = await mkdtemp(join(tmpdir(), 'seat-relay-poller-'));
  directories.push(directory);
  const subscriptions = new SubscriptionStore(
    join(directory, 'subscriptions.json')
  );
  await subscriptions.load();
  await subscriptions.upsert(token, ['G']);
  return subscriptions;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('SeatPoller', () => {
  it('only notifies for freed seats on subscribed floors', async () => {
    const subscriptions = await createSubscriptions();
    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 0 });
    const state = new MemoryState();
    const responses: Seat[][] = [
      [seat('G-1', 'G', 1, false), seat('1-1', '1', 1, false)],
      [seat('G-1', 'G', 1, true), seat('1-1', '1', 1, true)],
      [
        seat('G-1', 'G', 1, false),
        seat('1-1', '1', 1, false),
        seat('1-2', '1', 2, false),
        seat('1-3', '1', 3, true),
      ],
    ];

    const poller = new SeatPoller({
      seatApiUrl: 'http://example.test/seats',
      intervalMs: 60_000,
      requestTimeoutMs: 1000,
      stateStaleMs: 120_000,
      stateSaveIntervalMs: 0,
      state,
      subscriptions,
      dispatcher,
      fetchSeats: async () => {
        const next = responses.shift();
        if (!next) {
          throw new Error('No more responses');
        }
        return next;
      },
    });

    await poller.runOnce();
    expect(sender.calls).toHaveLength(0);

    await poller.runOnce();
    expect(sender.calls).toHaveLength(0);

    const status = await poller.runOnce();
    expect(status.lastFreedCount).toBe(2);
    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0][0].data).toEqual({
      type: 'seats-available',
      floor: 'G',
      seats: 'G-1',
      count: '1',
    });
    expect(state.snapshot?.seats['G-1']).toBe(false);

    dispatcher.stop();
  });

  it('notifies every subscriber once when the library becomes fully unoccupied', async () => {
    const subscriptions = await createSubscriptions();
    const secondToken = 'ExpoPushToken[second]';
    await subscriptions.upsert(secondToken, ['1']);
    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 0 });
    const state = new MemoryState();
    const responses: Seat[][] = [
      [seat('G-1', 'G', 1, true), seat('1-1', '1', 1, true)],
      [seat('G-1', 'G', 1, false), seat('1-1', '1', 1, false)],
      [seat('G-1', 'G', 1, false), seat('1-1', '1', 1, false)],
    ];

    const poller = new SeatPoller({
      seatApiUrl: 'http://example.test/seats',
      intervalMs: 60_000,
      requestTimeoutMs: 1000,
      stateStaleMs: 120_000,
      stateSaveIntervalMs: 0,
      state,
      subscriptions,
      dispatcher,
      fetchSeats: async () => {
        const next = responses.shift();
        if (!next) {
          throw new Error('No more responses');
        }
        return next;
      },
    });

    await poller.runOnce();
    expect(sender.calls).toHaveLength(0);

    const status = await poller.runOnce();
    expect(status.libraryClosed).toBe(true);
    expect(status.lastFreedCount).toBe(0);
    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0]).toHaveLength(2);
    expect(
      sender.calls[0].every(
        (message) => message.data.type === 'library-closed'
      )
    ).toBe(true);
    expect(sender.calls[0].map((message) => message.token).sort()).toEqual(
      [token, secondToken].sort()
    );

    await poller.runOnce();
    expect(sender.calls).toHaveLength(1);

    dispatcher.stop();
  });

  it('uses a recent persisted state as a baseline', async () => {
    const subscriptions = await createSubscriptions();
    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 0 });
    const state = new MemoryState();
    state.snapshot = {
      seats: { 'G-1': true, '1-1': true },
      fetchedAt: Date.now() - 10_000,
    };

    const poller = new SeatPoller({
      seatApiUrl: 'http://example.test/seats',
      intervalMs: 60_000,
      requestTimeoutMs: 1000,
      stateStaleMs: 120_000,
      stateSaveIntervalMs: 60_000,
      state,
      subscriptions,
      dispatcher,
      fetchSeats: async () => [
        seat('G-1', 'G', 1, false),
        seat('1-1', '1', 1, true),
      ],
    });

    await poller.start();
    poller.stop();

    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0][0].title).toBe('Seat G-1 is available');
    dispatcher.stop();
  });

  it('ignores stale persisted state and establishes a new baseline', async () => {
    const subscriptions = await createSubscriptions();
    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 0 });
    const state = new MemoryState();
    state.snapshot = {
      seats: { 'G-1': true },
      fetchedAt: Date.now() - 600_000,
    };

    const poller = new SeatPoller({
      seatApiUrl: 'http://example.test/seats',
      intervalMs: 60_000,
      requestTimeoutMs: 1000,
      stateStaleMs: 120_000,
      stateSaveIntervalMs: 60_000,
      state,
      subscriptions,
      dispatcher,
      fetchSeats: async () => [seat('G-1', 'G', 1, false)],
    });

    await poller.start();
    poller.stop();

    expect(sender.calls).toHaveLength(0);
    expect(state.snapshot?.seats['G-1']).toBe(false);
    dispatcher.stop();
  });

  it('reports API failures without wiping the baseline', async () => {
    const subscriptions = await createSubscriptions();
    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 0 });
    const state = new MemoryState();
    let fail = false;

    const poller = new SeatPoller({
      seatApiUrl: 'http://example.test/seats',
      intervalMs: 60_000,
      requestTimeoutMs: 1000,
      stateStaleMs: 120_000,
      stateSaveIntervalMs: 0,
      state,
      subscriptions,
      dispatcher,
      fetchSeats: async () => {
        if (fail) {
          throw new Error('Network down');
        }
        return [seat('G-1', 'G', 1, true)];
      },
    });

    await poller.runOnce();
    fail = true;
    const status = await poller.runOnce();

    expect(status).toMatchObject({
      ok: false,
      lastError: 'Network down',
      seatCount: 1,
    });
    expect(state.snapshot?.seats['G-1']).toBe(true);
    dispatcher.stop();
  });
});
