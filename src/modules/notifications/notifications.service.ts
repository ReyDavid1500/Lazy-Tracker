import { Injectable, Logger } from '@nestjs/common';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  to: string;        // Expo push token
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Sends push notifications to one or more Expo push tokens.
   * Silently logs failures rather than throwing — a failed push should
   * never break the stock-recording transaction.
   */
  async sendPush(messages: PushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.warn(`Expo Push API returned ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error('Failed to send push notification', err);
    }
  }
}
