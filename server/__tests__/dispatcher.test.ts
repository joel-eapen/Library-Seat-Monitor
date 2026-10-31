import { afterEach, describe, expect, it, vi } from 'vitest';
import { PushDispatcher } from '../src/dispatcher.js';
import type {
  PushMessage,
  PushSendResult,
  PushSender,
  Seat,
} from '../src/types.js';

class RecordingSender implements PushSender {
  readonly calls: PushMessage[][] = [];

  constructor(private readonly invalidTokens = new Set<string>()) {}

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    this.calls.push(messages);
    return {
      invalidTokens: messages
        .map((message) => message.token)
        .filter((token) => this.invalidTokens.has(token)),
    };
  }
}

function seat(id: string, floor = 'G', number = 1): Seat {
  return { id, floor, number, occupied: false };
}

const token = 'ExpoPushToken[test]';

afterEach(() => {
  vi.useRealTimers();
});

describe('PushDispatcher', () => {
  it('sends immediately, then batches changes during the cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({
      sender,
      cooldownMs: 30_000,
    });

    await dispatcher.enqueue(token, [seat('G-1')]);
    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0][0].title).toBe('Seat G-1 is available');

    await dispatcher.enqueue(token, [seat('G-2', 'G', 2)]);
    await dispatcher.enqueue(token, [seat('G-3', 'G', 3)]);
    expect(dispatcher.pendingCount(token)).toBe(2);
    expect(sender.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(sender.calls).toHaveLength(2);
    expect(sender.calls[1]).toHaveLength(1);
    expect(sender.calls[1][0].title).toBe(
      '2 seats just became available'
    );
    expect(sender.calls[1][0].data.seats).toBe('G-2,G-3');

    dispatcher.stop();
  });

  it('deduplicates the same seat during a cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 30_000 });

    await dispatcher.enqueue(token, [seat('G-1')]);
    await dispatcher.enqueue(token, [seat('G-1')]);
    expect(dispatcher.pendingCount(token)).toBe(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(sender.calls[1][0].data.seats).toBe('G-1');

    dispatcher.stop();
  });

  it('reports invalid tokens', async () => {
    const sender = new RecordingSender(new Set([token]));
    const onInvalidTokens = vi.fn();
    const dispatcher = new PushDispatcher({
      sender,
      cooldownMs: 0,
      onInvalidTokens,
    });

    await dispatcher.enqueue(token, [seat('G-1')]);

    expect(onInvalidTokens).toHaveBeenCalledWith([token]);
    dispatcher.stop();
  });

  it('clears queued changes when a subscription changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const sender = new RecordingSender();
    const dispatcher = new PushDispatcher({ sender, cooldownMs: 30_000 });

    await dispatcher.enqueue(token, [seat('G-1')]);
    await dispatcher.enqueue(token, [seat('G-2', 'G', 2)]);
    expect(dispatcher.pendingCount(token)).toBe(1);

    dispatcher.clear(token);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(sender.calls).toHaveLength(1);
    dispatcher.stop();
  });
});
