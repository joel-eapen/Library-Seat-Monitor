import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const DEFAULT_SEAT_API_URL =
  'https://v1.nitj.ac.in/erp/library_seating/api.php?action=get-seats';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SEAT_API_URL: z.string().min(1).default(DEFAULT_SEAT_API_URL),
  POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(8000),
  NOTIFY_COOLDOWN_MS: z.coerce.number().int().min(0).default(30000),
  STATE_STALE_MS: z.coerce.number().int().min(0).default(120000),
  STATE_SAVE_INTERVAL_MS: z.coerce.number().int().min(0).default(60000),
  DATA_DIR: z.string().min(1).default('./data'),
  EXPO_ACCESS_TOKEN: z.string().trim().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment configuration:',
    parsed.error.issues.map((issue) => issue.message).join(', ')
  );
  process.exit(1);
}

const env = parsed.data;
const dataDir = resolve(process.cwd(), env.DATA_DIR);

export const config = {
  port: env.PORT,
  seatApiUrl: env.SEAT_API_URL,
  pollIntervalMs: env.POLL_INTERVAL_MS,
  requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
  notifyCooldownMs: env.NOTIFY_COOLDOWN_MS,
  stateStaleMs: env.STATE_STALE_MS,
  stateSaveIntervalMs: env.STATE_SAVE_INTERVAL_MS,
  dataDir,
  subscriptionsFile: resolve(dataDir, 'subscriptions.json'),
  stateFile: resolve(dataDir, 'state.json'),
  expoAccessToken: env.EXPO_ACCESS_TOKEN,
};
