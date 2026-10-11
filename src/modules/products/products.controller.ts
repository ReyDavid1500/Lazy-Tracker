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
} from '@nestjs/common';
import { InventoryItemDto, ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateThresholdDto } from './dto/update-threshold.dto.js';
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

  /** List all active products for the caller's business. */
  @Roles('manager', 'worker')
  @Get()
  getInventory(@CurrentUser() user: JwtPayload): Promise<InventoryItemDto[]> {
    return this.productsService.getInventory(user.businessId);
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
