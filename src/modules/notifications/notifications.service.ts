import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import webpush from 'web-push';
import {
  WebPushSubscription,
  type WebPushSubscriptionDocument,
} from './web-push-subscription.schema.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
};

type WebPushSubscriptionDto = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  readonly #logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(WebPushSubscription.name)
    private readonly subModel: Model<WebPushSubscriptionDocument>,
  ) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@lazytracker.app';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.#logger.log('Web Push VAPID keys configured');
    } else {
      this.#logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — web push disabled');
    }
  }

  async saveWebSubscription(userId: string, dto: WebPushSubscriptionDto): Promise<void> {
    await this.subModel.findOneAndUpdate(
      { userId, endpoint: dto.endpoint },
      { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      { upsert: true, new: true },
    );
  }

  async sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<void> {
    const subs = await this.subModel.find({ userId });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.subModel.deleteOne({ _id: sub._id });
        } else {
          this.#logger.warn(`Web push failed for user ${userId}: ${String(err.message)}`);
        }
      }
    }
  }

  /** Legacy Expo push (kept for backward compatibility) */
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
        this.#logger.warn(`Expo Push API ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.#logger.error('Expo push failed', err);
    }
  }
}
