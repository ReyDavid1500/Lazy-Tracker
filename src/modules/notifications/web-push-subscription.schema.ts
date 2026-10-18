import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebPushSubscriptionDocument = WebPushSubscription & Document;

@Schema({ collection: 'web_push_subscriptions', timestamps: true })
export class WebPushSubscription {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  p256dh: string;

  @Prop({ required: true })
  auth: string;
}

export const WebPushSubscriptionSchema = SchemaFactory.createForClass(WebPushSubscription);

// Compound unique index: one subscription per user+endpoint pair
WebPushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
