import { buildNotificationMessages } from './notifications.js';
import type { PushSender, Seat } from './types.js';

type DispatcherOptions = {
  sender: PushSender;
  cooldownMs: number;
  onInvalidTokens?: (tokens: string[]) => void | Promise<void>;
  now?: () => number;
};

export class PushDispatcher {
  private readonly sender: PushSender;
  private readonly cooldownMs: number;
  private readonly onInvalidTokens?: (
    tokens: string[]
  ) => void | Promise<void>;
  private readonly now: () => number;
  private readonly pending = new Map<string, Map<string, Seat>>();
  private readonly lastSentAt = new Map<string, number>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly flushing = new Set<string>();

  constructor(options: DispatcherOptions) {
    this.sender = options.sender;
    this.cooldownMs = options.cooldownMs;
    this.onInvalidTokens = options.onInvalidTokens;
    this.now = options.now ?? Date.now;
  }

  async enqueue(token: string, seats: Seat[]): Promise<void> {
    if (seats.length === 0) {
      return;
    }

    const pending =
      this.pending.get(token) ?? new Map<string, Seat>();
    for (const seat of seats) {
      pending.set(seat.id, seat);
    }
    this.pending.set(token, pending);

    await this.scheduleOrFlush(token);
  }

  async notifyLibraryClosed(tokens: string[]): Promise<void> {
    const uniqueTokens = [...new Set(tokens)];
    if (uniqueTokens.length === 0) {
      return;
    }

    for (const token of uniqueTokens) {
      this.clear(token);
    }

    try {
      const result = await this.sender.send(
        uniqueTokens.map((token) => ({
          token,
          title: 'Library is closed',
          body: 'All seats are unoccupied.',
          data: { type: 'library-closed' },
        }))
      );
      if (result.invalidTokens.length > 0 && this.onInvalidTokens) {
        await this.onInvalidTokens(result.invalidTokens);
      }
    } catch (error) {
      console.error('Could not send library closed notification:', error);
    }
  }

  clear(token: string): void {
    const timer = this.timers.get(token);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(token);
    }
    this.pending.delete(token);
    this.lastSentAt.delete(token);
  }

  stop(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pending.clear();
  }

  pendingCount(token: string): number {
    return this.pending.get(token)?.size ?? 0;
  }

  private async scheduleOrFlush(token: string): Promise<void> {
    const now = this.now();
    const lastSent = this.lastSentAt.get(token) ?? 0;
    const remaining = this.cooldownMs - (now - lastSent);

    if (remaining <= 0) {
      await this.flush(token);
      return;
    }

    if (this.timers.has(token)) {
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(token);
      void this.flush(token).catch((error) => {
        console.error('Push dispatcher flush failed:', error);
      });
    }, remaining);
    this.timers.set(token, timer);
  }

  private async flush(token: string): Promise<void> {
    if (this.flushing.has(token)) {
      return;
    }

    const pending = this.pending.get(token);
    if (!pending || pending.size === 0) {
      return;
    }

    this.flushing.add(token);
    this.pending.delete(token);
    this.lastSentAt.set(token, this.now());

    try {
      const messages = buildNotificationMessages(token, [
        ...pending.values(),
      ]);
      const result = await this.sender.send(messages);
      if (result.invalidTokens.length > 0 && this.onInvalidTokens) {
        await this.onInvalidTokens(result.invalidTokens);
      }
    } catch (error) {
      console.error('Could not send push notifications:', error);
    } finally {
      this.flushing.delete(token);

      if (this.pending.has(token)) {
        void this.scheduleOrFlush(token);
      }
    }
  }
}
