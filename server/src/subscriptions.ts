import { z } from 'zod';
import { readJsonFile, writeJsonFile } from './storage.js';
import type { Subscription } from './types.js';

const FLOOR_ORDER = ['G', '1', '2', '3'];

export const subscriptionInputSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(
      /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/,
      'Expected an Expo push token'
    ),
  floors: z
    .array(z.enum(['G', '1', '2', '3']))
    .min(1)
    .max(4)
    .transform((floors) => [...new Set(floors)]),
});

export const deleteSubscriptionSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

export const testNotificationSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

const storedSubscriptionSchema = z.object({
  token: z.string().min(1),
  floors: z.array(z.string()).min(1),
  updatedAt: z.number(),
});

function canonicalFloors(floors: string[]): string[] {
  const selected = new Set(floors);
  return FLOOR_ORDER.filter((floor) => selected.has(floor));
}

export class SubscriptionStore {
  private readonly subscriptions = new Map<string, Subscription>();
  private loaded = false;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    let raw: unknown;
    try {
      raw = await readJsonFile<unknown>(this.filePath);
    } catch (error) {
      console.error('Could not read subscriptions file:', error);
      this.loaded = true;
      return;
    }

    if (raw) {
      const parsed = z.array(storedSubscriptionSchema).safeParse(raw);
      if (parsed.success) {
        for (const subscription of parsed.data) {
          const floors = canonicalFloors(subscription.floors);
          if (floors.length === 0) {
            continue;
          }
          this.subscriptions.set(subscription.token, {
            ...subscription,
            floors,
          });
        }
      } else {
        console.error(
          'Subscriptions file is invalid; starting with no subscriptions.'
        );
      }
    }

    this.loaded = true;
  }

  list(): Subscription[] {
    return [...this.subscriptions.values()].map((subscription) => ({
      ...subscription,
      floors: [...subscription.floors],
    }));
  }

  count(): number {
    return this.subscriptions.size;
  }

  get(token: string): Subscription | null {
    const subscription = this.subscriptions.get(token);
    return subscription
      ? { ...subscription, floors: [...subscription.floors] }
      : null;
  }

  async upsert(token: string, floors: string[]): Promise<Subscription> {
    const subscription: Subscription = {
      token,
      floors: canonicalFloors(floors),
      updatedAt: Date.now(),
    };
    this.subscriptions.set(token, subscription);
    await this.persist();
    return { ...subscription, floors: [...subscription.floors] };
  }

  async remove(token: string): Promise<boolean> {
    const removed = this.subscriptions.delete(token);
    if (removed) {
      await this.persist();
    }
    return removed;
  }

  async removeMany(tokens: string[]): Promise<void> {
    let changed = false;
    for (const token of tokens) {
      changed = this.subscriptions.delete(token) || changed;
    }
    if (changed) {
      await this.persist();
    }
  }

  private persist(): Promise<void> {
    const snapshot = this.list();
    this.writeChain = this.writeChain
      .then(() => writeJsonFile(this.filePath, snapshot))
      .catch((error) => {
        console.error('Could not persist subscriptions file:', error);
      });
    return this.writeChain;
  }
}
