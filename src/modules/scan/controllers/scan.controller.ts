import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ScanImageDto } from '../dto/scan-image.dto.js';
import type { ScanResultDto } from '../dto/scan-result.dto.js';
import { Roles } from '../../auth/decorators/index.js';
import { ScanService } from '../services/scan.service.js';

@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Roles('worker', 'manager')
  @HttpCode(200)
  @Post()
  identify(@Body() dto: ScanImageDto): Promise<ScanResultDto> {
    return this.scanService.identifyProduct(dto);
  }
}
