import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { PushDispatcher } from '../src/dispatcher.js';
import { SubscriptionStore } from '../src/subscriptions.js';
import type {
  PollStatus,
  PushMessage,
  PushSendResult,
  PushSender,
} from '../src/types.js';

class FakeSender implements PushSender {
  readonly calls: PushMessage[][] = [];
  invalidTokens = new Set<string>();

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    this.calls.push(messages);
    return {
      invalidTokens: messages
        .map((message) => message.token)
        .filter((token) => this.invalidTokens.has(token)),
    };
  }
}

const directories: string[] = [];
const token = 'ExpoPushToken[test]';

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'seat-relay-app-'));
  directories.push(directory);
  const subscriptions = new SubscriptionStore(
    join(directory, 'subscriptions.json')
  );
  await subscriptions.load();
  const sender = new FakeSender();
  const dispatcher = new PushDispatcher({ sender, cooldownMs: 0 });
  const status: PollStatus = {
    ok: true,
    lastSuccessAt: Date.now(),
    lastError: null,
    seatCount: 390,
    lastFreedCount: 2,
  };
  const app = createApp({
    subscriptions,
    dispatcher,
    sender,
    getStatus: () => status,
  });
  return { app, subscriptions, sender, dispatcher };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('push relay API', () => {
  it('registers a subscription and reports health', async () => {
    const { app, subscriptions } = await setup();

    const registration = await request(app)
      .post('/api/subscriptions')
      .send({ token, floors: ['2', 'G'] });

    expect(registration.status).toBe(200);
    expect(registration.body.subscription.floors).toEqual(['G', '2']);
    expect(subscriptions.get(token)?.floors).toEqual(['G', '2']);

    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({
      ok: true,
      seatCount: 390,
      subscriptions: 1,
    });
  });

  it('validates registration input', async () => {
    const { app } = await setup();

    const response = await request(app)
      .post('/api/subscriptions')
      .send({ token: 'bad', floors: ['9'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
  });

  it('removes a subscription', async () => {
    const { app, subscriptions } = await setup();
    await request(app)
      .post('/api/subscriptions')
      .send({ token, floors: ['1'] });

    const response = await request(app)
      .delete('/api/subscriptions')
      .send({ token });

    expect(response.status).toBe(200);
    expect(subscriptions.get(token)).toBeNull();
  });

  it('sends a test notification', async () => {
    const { app, sender } = await setup();

    const response = await request(app)
      .post('/api/test-notification')
      .send({ token });

    expect(response.status).toBe(200);
    expect(sender.calls).toHaveLength(1);
    expect(sender.calls[0][0].data).toEqual({ type: 'test' });
  });

  it('drops tokens rejected by the push provider', async () => {
    const { app, sender, subscriptions } = await setup();
    await request(app)
      .post('/api/subscriptions')
      .send({ token, floors: ['1'] });
    sender.invalidTokens.add(token);

    const response = await request(app)
      .post('/api/test-notification')
      .send({ token });

    expect(response.status).toBe(410);
    expect(subscriptions.get(token)).toBeNull();
  });

  it('returns JSON for unknown routes', async () => {
    const { app } = await setup();
    const response = await request(app).get('/nope');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
  });
});
