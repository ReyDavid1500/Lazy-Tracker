import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';
import type { JwtPayload } from '../auth/types.js';

interface WebPushSubscriptionDto {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() body: WebPushSubscriptionDto,
  ) {
    await this.notificationsService.saveWebSubscription(user.businessId, body);
    return { ok: true };
  }
}
