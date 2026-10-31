import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  subscriptionInputSchema,
  SubscriptionStore,
} from '../src/subscriptions.js';

const directories: string[] = [];

async function createStore(): Promise<{
  store: SubscriptionStore;
  filePath: string;
  directory: string;
}> {
  const directory = await mkdtemp(join(tmpdir(), 'seat-relay-'));
  directories.push(directory);
  const filePath = join(directory, 'subscriptions.json');
  const store = new SubscriptionStore(filePath);
  await store.load();
  return { store, filePath, directory };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('subscriptionInputSchema', () => {
  it('accepts and deduplicates valid floors', () => {
    const parsed = subscriptionInputSchema.parse({
      token: 'ExpoPushToken[abc]',
      floors: ['3', '1', '1'],
    });
    expect(parsed).toEqual({
      token: 'ExpoPushToken[abc]',
      floors: ['3', '1'],
    });
  });

  it('rejects unknown floors and bad tokens', () => {
    expect(
      subscriptionInputSchema.safeParse({
        token: 'nope',
        floors: ['1'],
      }).success
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({
        token: 'ExpoPushToken[abc]',
        floors: ['9'],
      }).success
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({
        token: 'ExpoPushToken[abc]',
        floors: [],
      }).success
    ).toBe(false);
  });
});

describe('SubscriptionStore', () => {
  it('upserts in canonical floor order and persists', async () => {
    const { store, filePath } = await createStore();

    await store.upsert('ExpoPushToken[abc]', ['3', 'G', '1']);
    expect(store.get('ExpoPushToken[abc]')?.floors).toEqual(['G', '1', '3']);

    const reloaded = new SubscriptionStore(filePath);
    await reloaded.load();
    expect(reloaded.get('ExpoPushToken[abc]')?.floors).toEqual([
      'G',
      '1',
      '3',
    ]);
  });

  it('removes subscriptions', async () => {
    const { store, filePath } = await createStore();
    await store.upsert('ExpoPushToken[abc]', ['1']);
    await store.upsert('ExpoPushToken[def]', ['2']);

    await store.removeMany(['ExpoPushToken[abc]']);

    const reloaded = new SubscriptionStore(filePath);
    await reloaded.load();
    expect(reloaded.get('ExpoPushToken[abc]')).toBeNull();
    expect(reloaded.get('ExpoPushToken[def]')?.floors).toEqual(['2']);
  });

  it('starts empty when the file is corrupt', async () => {
    const { filePath, directory } = await createStore();
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, '{not json', 'utf8');

    const store = new SubscriptionStore(join(directory, 'subscriptions.json'));
    await store.load();
    expect(store.count()).toBe(0);
  });
});
