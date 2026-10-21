import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InventoryItemDto, PaginatedInventoryDto, ProductsService } from './products.service.js';
import { InventoryQueryDto } from './dto/inventory-query.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateThresholdDto } from './dto/update-threshold.dto.js';
import { UpdateIntervalDto } from './dto/update-interval.dto.js';
import { Roles } from '../auth/decorators/index.js';
import { CurrentUser } from '../auth/decorators/index.js';
import type { JwtPayload } from '../auth/types.js';
import type { Product } from './entities/product.entity.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Any authenticated user can create a new product (e.g. after scanning unknown item). */
  @Roles('manager', 'worker')
  @Post()
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Product> {
    return this.productsService.create(dto, user.businessId);
  }

  /** List paginated active products for the caller's business, with optional search. */
  @Roles('manager', 'worker')
  @Get()
  getInventory(
    @Query() query: InventoryQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedInventoryDto> {
    return this.productsService.getInventory(user.businessId, query);
  }

  /** Manager updates the low-stock alert threshold for a product. */
  @Roles('manager')
  @Patch(':id/threshold')
  updateThreshold(
    @Param('id') productId: string,
    @Body() dto: UpdateThresholdDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Product> {
    return this.productsService.updateThreshold(productId, user.businessId, dto);
  }

  /** Manager sets how many days between expected stock counts (optional, null clears it). */
  @Roles('manager')
  @Patch(':id/interval')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateInterval(
    @Param('id') productId: string,
    @Body() dto: UpdateIntervalDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.productsService.updateInterval(productId, user.businessId, dto);
  }

  /** Manager soft-deletes a product (marks isActive: false). */
  @Roles('manager')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(
    @Param('id') productId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.productsService.deactivateProduct(productId, user.businessId);
  }
}
