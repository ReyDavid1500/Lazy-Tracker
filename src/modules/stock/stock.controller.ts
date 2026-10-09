import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { StockService } from './stock.service.js';
import { RecordStockDto } from './dto/record-stock.dto.js';
import type { StockEntryResponseDto } from './dto/stock-entry-response.dto.js';
import type { InventoryItemDto } from './dto/inventory-item.dto.js';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import type { JwtPayload } from '../auth/types.js';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  /**
   * POST /stock/:productId
   * Worker records the current stock count for a product after scanning.
   * Triggers a low-stock alert if the new count is at or below the threshold.
   */
  @Roles('worker', 'manager')
  @HttpCode(201)
  @Post(':productId')
  recordCount(
    @Param('productId') productId: string,
    @Body() dto: RecordStockDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StockEntryResponseDto> {
    return this.stockService.recordCount(productId, user.userId, user.businessId, dto);
  }

  /**
   * GET /stock
   * Returns the full inventory for this business, sorted by name.
   * Low-stock items are flagged with isLow: true.
   */
  @Roles('manager')
  @Get()
  getInventory(@CurrentUser() user: JwtPayload): Promise<InventoryItemDto[]> {
    return this.stockService.getInventory(user.businessId);
  }
}
