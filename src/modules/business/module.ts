import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Business, BusinessSchema } from './entities/business.entity.js';
import { BusinessService } from './business.service.js';
import { BusinessController } from './business.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Business.name, schema: BusinessSchema }]),
  ],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [MongooseModule, BusinessService],
})
export class BusinessModule {}
