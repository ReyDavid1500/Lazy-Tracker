import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ScanService } from '../services/scan.service.js';
import { ScanImageDto } from '../dto/scan-image.dto.js';
import type { ScanResponseDto } from '../dto/scan-response.dto.js';
import { CurrentUser, Roles } from '../../auth/decorators/index.js';
import type { JwtPayload } from '../../auth/types.js';

@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  /**
   * POST /scan
   * Worker sends a base64 photo → AI identifies it → DB lookup for existing product.
   * Response tells the mobile app whether this is a known product or a new one.
   */
  @Roles('worker', 'manager')
  @HttpCode(200)
  @Post()
  scan(
    @Body() dto: ScanImageDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScanResponseDto> {
    return this.scanService.scan(dto, user.businessId);
  }
}
