import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebPushSubscription, WebPushSubscriptionSchema } from './web-push-subscription.schema.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebPushSubscription.name, schema: WebPushSubscriptionSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
