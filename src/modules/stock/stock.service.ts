import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StockEntry } from './entities/stock-entry.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { RecordStockDto } from './dto/record-stock.dto.js';
import type { StockEntryResponseDto } from './dto/stock-entry-response.dto.js';
import type { InventoryItemDto } from './dto/inventory-item.dto.js';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectModel(StockEntry.name) private readonly stockModel: Model<StockEntry>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── POST /stock/:productId ───────────────────────────────────────────────

  async recordCount(
    productId: string,
    userId: string,
    businessId: string,
    dto: RecordStockDto,
  ): Promise<StockEntryResponseDto> {
    // Verify product belongs to this business
    const product = await this.productModel.findOne({
      _id: productId,
      businessId,
      isActive: true,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Persist the stock entry
    const entry = await this.stockModel.create({
      businessId,
      productId,
      scannedByUserId: userId,
      quantity: dto.quantity,
      aiIdentificationNote: dto.aiIdentificationNote ?? null,
    });

    // Update the product's current stock count
    product.currentStock = dto.quantity;
    await product.save();

    // Check if we need to fire a low-stock alert
    const alertFired = this.isLowStock(product.currentStock, product.lowStockThreshold);

    if (alertFired) {
      await this.#sendLowStockAlert(businessId, product.name, product.currentStock, product.lowStockThreshold);
    }

    return {
      id: (entry._id as { toString(): string }).toString(),
      productId,
      quantity: dto.quantity,
      alertFired,
      createdAt: (entry as unknown as { createdAt: Date }).createdAt,
    };
  }

  // ─── GET /stock ──────────────────────────────────────────────────────────

  async getInventory(businessId: string): Promise<InventoryItemDto[]> {
    const products = await this.productModel
      .find({ businessId, isActive: true })
      .sort({ name: 1 })
      .exec();

    return products.map((p) => ({
      productId: (p._id as { toString(): string }).toString(),
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      currentStock: p.currentStock,
      lowStockThreshold: p.lowStockThreshold,
      isLow: this.isLowStock(p.currentStock, p.lowStockThreshold),
    }));
  }

  // ─── Alert threshold logic (public for testability) ─────────────────────

  /**
   * Pure predicate — the only business rule for low-stock.
   * Extracted so unit tests can exercise it without DB or network.
   */
  isLowStock(currentStock: number, threshold: number): boolean {
    return currentStock <= threshold;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  async #sendLowStockAlert(
    businessId: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ): Promise<void> {
    // Find all active managers in this business who have registered a push token
    const managers = await this.userModel.find({
      businessId,
      role: 'manager',
      isActive: true,
      pushToken: { $ne: null },
    });

    if (managers.length === 0) return;

    const messages = managers.map((m) => ({
      to: m.pushToken as string,
      title: '⚠️ Low stock alert',
      body: `${productName} is low (${currentStock} left, threshold: ${threshold})`,
      data: { productName, currentStock, threshold },
    }));

    this.logger.log(`Sending low-stock alert for "${productName}" to ${messages.length} manager(s)`);
    await this.notificationsService.sendPush(messages);
  }
}
