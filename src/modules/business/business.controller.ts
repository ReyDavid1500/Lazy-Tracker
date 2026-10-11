import { Controller, Get } from '@nestjs/common';
import { BusinessService } from './business.service.js';
import { Roles } from '../auth/decorators/index.js';
import { CurrentUser } from '../auth/decorators/index.js';
import type { JwtPayload } from '../auth/types.js';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  /** Returns the caller's own business info. */
  @Roles('manager', 'worker')
  @Get('me')
  getMyBusiness(@CurrentUser() user: JwtPayload) {
    return this.businessService.findById(user.businessId);
  }
}
