import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateWorkerDto } from './dto/create-worker.dto.js';
import { UpdatePushTokenDto } from './dto/update-push-token.dto.js';
import type { WorkerResponseDto } from './dto/worker-response.dto.js';
import { Roles } from '../auth/decorators/index.js';
import { CurrentUser } from '../auth/decorators/index.js';
import type { JwtPayload } from '../auth/types.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Manager creates a new worker for their business. Returns auto-generated userName. */
  @Roles('manager')
  @Post()
  createWorker(
    @Body() dto: CreateWorkerDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkerResponseDto> {
    return this.usersService.createWorker(dto, user.businessId);
  }

  /** Manager lists all team members for their business. */
  @Roles('manager')
  @Get()
  listMembers(@CurrentUser() user: JwtPayload): Promise<WorkerResponseDto[]> {
    return this.usersService.listMembers(user.businessId);
  }

  /**
   * PATCH /users/me/push-token
   * Any authenticated user registers their Expo push token.
   */
  @Roles('manager', 'worker')
  @HttpCode(204)
  @Patch('me/push-token')
  updatePushToken(
    @Body() dto: UpdatePushTokenDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.usersService.updatePushToken(user.userId, dto);
  }
}
