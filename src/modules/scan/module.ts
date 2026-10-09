import { Module } from '@nestjs/common';
import { ScanService } from './services/scan.service.js';
import { ScanController } from './controllers/scan.controller.js';

@Module({
  controllers: [ScanController],
  providers: [ScanService],
  exports: [ScanService],
})
export class ScanModule {}
