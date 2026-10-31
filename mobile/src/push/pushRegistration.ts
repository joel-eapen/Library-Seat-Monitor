import { fetchWithTimeout } from '../api/seatApi';
import { config } from '../config';

async function parseResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Push relay returned HTTP ${response.status}${text ? `: ${text}` : ''}`
    );
  }
}

export function isPushRelayConfigured(): boolean {
  return config.pushRelayUrl.length > 0;
}

export async function registerPushSubscription(
  token: string,
  floors: string[]
): Promise<void> {
  if (!config.pushRelayUrl) {
    throw new Error('Push relay URL is not configured');
  }

  const response = await fetchWithTimeout(
    `${config.pushRelayUrl}/api/subscriptions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, floors }),
    }
  );
  await parseResponse(response);
}

export async function unregisterPushSubscription(
  token: string
): Promise<void> {
  if (!config.pushRelayUrl) {
    return;
  }

  const response = await fetchWithTimeout(
    `${config.pushRelayUrl}/api/subscriptions`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }
  );
  await parseResponse(response);
}

export async function sendTestPushNotification(token: string): Promise<void> {
  if (!config.pushRelayUrl) {
    throw new Error('Push relay URL is not configured');
  }

  const response = await fetchWithTimeout(
    `${config.pushRelayUrl}/api/test-notification`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }
  );
  await parseResponse(response);
}
