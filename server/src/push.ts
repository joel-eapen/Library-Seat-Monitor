import { Expo } from 'expo-server-sdk';
import type {
  PushMessage,
  PushSendResult,
  PushSender,
} from './types.js';

export class ExpoPushSender implements PushSender {
  private readonly expo: Expo;

  constructor(accessToken?: string) {
    this.expo = new Expo({
      useFcmV1: true,
      ...(accessToken ? { accessToken } : {}),
    });
  }

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    const invalidTokens = new Set<string>();
    const validMessages = messages.filter((message) => {
      if (Expo.isExpoPushToken(message.token)) {
        return true;
      }
      invalidTokens.add(message.token);
      return false;
    });

    if (validMessages.length === 0) {
      return { invalidTokens: [...invalidTokens] };
    }

    const expoMessages = validMessages.map((message) => ({
      to: message.token,
      title: message.title,
      body: message.body,
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'seat-availability-v2',
      ttl: 3600,
      data: message.data,
    }));

    const chunks = this.expo.chunkPushNotifications(expoMessages);

    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, index) => {
        if (ticket.status !== 'error') {
          return;
        }

        const token = chunk[index]?.to;
        if (typeof token !== 'string') {
          return;
        }

        if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.add(token);
          return;
        }

        console.error(
          `Push ticket error for ${token}:`,
          ticket.message,
          ticket.details
        );
      });
    }

    return { invalidTokens: [...invalidTokens] };
  }
}
