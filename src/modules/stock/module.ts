import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockEntry, StockEntrySchema } from './entities/stock-entry.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StockEntry.name, schema: StockEntrySchema }]),
  ],
  exports: [MongooseModule],
})
export class StockModule {}
