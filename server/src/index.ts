import type { Server } from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { PushDispatcher } from './dispatcher.js';
import { SeatPoller } from './poller.js';
import { ExpoPushSender } from './push.js';
import { StateStore } from './stateStore.js';
import { SubscriptionStore } from './subscriptions.js';

async function main(): Promise<void> {
  const subscriptions = new SubscriptionStore(config.subscriptionsFile);
  await subscriptions.load();

  const state = new StateStore(config.stateFile);
  const sender = new ExpoPushSender(config.expoAccessToken);
  const dispatcher = new PushDispatcher({
    sender,
    cooldownMs: config.notifyCooldownMs,
    onInvalidTokens: (tokens) => subscriptions.removeMany(tokens),
  });

  const poller = new SeatPoller({
    seatApiUrl: config.seatApiUrl,
    intervalMs: config.pollIntervalMs,
    requestTimeoutMs: config.requestTimeoutMs,
    stateStaleMs: config.stateStaleMs,
    stateSaveIntervalMs: config.stateSaveIntervalMs,
    state,
    subscriptions,
    dispatcher,
  });

  const app = createApp({
    subscriptions,
    dispatcher,
    sender,
    getStatus: () => poller.getStatus(),
  });

  let server: Server;
  const serverReady = new Promise<void>((resolve, reject) => {
    server = app.listen(config.port, () => {
      console.log(`Push relay listening on port ${config.port}`);
      resolve();
    });
    server.on('error', reject);
  });

  await serverReady;
  await poller.start();

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}; shutting down.`);
    poller.stop();
    dispatcher.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
