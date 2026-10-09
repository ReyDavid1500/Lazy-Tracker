import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockEntry, StockEntrySchema } from './entities/stock-entry.entity.js';
import { StockService } from './stock.service.js';
import { StockController } from './stock.controller.js';
import { ProductsModule } from '../products/index.js';
import { UsersModule } from '../users/index.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StockEntry.name, schema: StockEntrySchema }]),
    ProductsModule,   // provides Product model + ProductsService
    UsersModule,      // provides User model (for manager push token lookup)
    NotificationsModule,
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
