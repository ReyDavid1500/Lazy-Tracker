import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { StockService } from '../stock.service.js';
import { StockEntry } from '../entities/stock-entry.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { NotificationsService } from '../../notifications/notifications.service.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BUSINESS_ID = 'biz-001';
const PRODUCT_ID = 'prod-001';
const USER_ID = 'user-001';

function makeProduct(overrides: Partial<{
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
}> = {}) {
  return {
    _id: PRODUCT_ID,
    name: 'Milk 1L',
    businessId: BUSINESS_ID,
    isActive: true,
    currentStock: 10,
    lowStockThreshold: 5,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeManager(pushToken: string | null = 'ExponentPushToken[xxx]') {
  return { _id: 'mgr-001', pushToken };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockService', () => {
  let service: StockService;
  let stockModel: { create: ReturnType<typeof vi.fn> };
  let productModel: { findOne: ReturnType<typeof vi.fn>; find: ReturnType<typeof vi.fn> };
  let userModel: { find: ReturnType<typeof vi.fn> };
  let notificationsService: { sendPush: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    stockModel = { create: vi.fn() };
    productModel = { findOne: vi.fn(), find: vi.fn() };
    userModel = { find: vi.fn() };
    notificationsService = { sendPush: vi.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getModelToken(StockEntry.name), useValue: stockModel },
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(StockService);
  });

  // ─── isLowStock (pure unit) ───────────────────────────────────────────────

  describe('isLowStock', () => {
    it('returns true when stock equals threshold', () => {
      expect(service.isLowStock(5, 5)).toBe(true);
    });

    it('returns true when stock is below threshold', () => {
      expect(service.isLowStock(2, 5)).toBe(true);
    });

    it('returns false when stock is above threshold', () => {
      expect(service.isLowStock(6, 5)).toBe(false);
    });

    it('returns true when stock is zero', () => {
      expect(service.isLowStock(0, 5)).toBe(true);
    });

    it('returns true when both stock and threshold are zero', () => {
      expect(service.isLowStock(0, 0)).toBe(true);
    });
  });

  // ─── recordCount ─────────────────────────────────────────────────────────

  describe('recordCount', () => {
    it('throws NotFoundException when product does not belong to the business', async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('persists a stock entry and updates product currentStock', async () => {
      const product = makeProduct({ currentStock: 10, lowStockThreshold: 5 });
      productModel.findOne.mockResolvedValue(product);

      const fakeEntry = {
        _id: { toString: () => 'entry-001' },
        createdAt: new Date('2025-01-01'),
      };
      stockModel.create.mockResolvedValue(fakeEntry);
      userModel.find.mockResolvedValue([]);

      const result = await service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 8 });

      expect(product.currentStock).toBe(8);
      expect(product.save).toHaveBeenCalledOnce();
      expect(result.quantity).toBe(8);
      expect(result.productId).toBe(PRODUCT_ID);
    });

    it('sets alertFired to false when new stock is above threshold', async () => {
      const product = makeProduct({ currentStock: 10, lowStockThreshold: 5 });
      productModel.findOne.mockResolvedValue(product);
      stockModel.create.mockResolvedValue({ _id: { toString: () => 'e1' }, createdAt: new Date() });
      userModel.find.mockResolvedValue([]);

      const result = await service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 8 });

      expect(result.alertFired).toBe(false);
      expect(notificationsService.sendPush).not.toHaveBeenCalled();
    });

    it('sets alertFired to true and sends push when stock hits threshold', async () => {
      const product = makeProduct({ currentStock: 10, lowStockThreshold: 5 });
      productModel.findOne.mockResolvedValue(product);
      stockModel.create.mockResolvedValue({ _id: { toString: () => 'e1' }, createdAt: new Date() });

      const manager = makeManager('ExponentPushToken[abc]');
      userModel.find.mockResolvedValue([manager]);

      const result = await service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 5 });

      expect(result.alertFired).toBe(true);
      expect(notificationsService.sendPush).toHaveBeenCalledOnce();
      const [messages] = notificationsService.sendPush.mock.calls[0];
      expect(messages[0].to).toBe('ExponentPushToken[abc]');
    });

    it('sets alertFired to true when stock drops below threshold', async () => {
      const product = makeProduct({ currentStock: 10, lowStockThreshold: 5 });
      productModel.findOne.mockResolvedValue(product);
      stockModel.create.mockResolvedValue({ _id: { toString: () => 'e1' }, createdAt: new Date() });

      userModel.find.mockResolvedValue([makeManager()]);

      const result = await service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 3 });

      expect(result.alertFired).toBe(true);
    });

    it('does not call sendPush when no managers have push tokens', async () => {
      const product = makeProduct({ lowStockThreshold: 5 });
      productModel.findOne.mockResolvedValue(product);
      stockModel.create.mockResolvedValue({ _id: { toString: () => 'e1' }, createdAt: new Date() });
      userModel.find.mockResolvedValue([]); // no managers found

      await service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 2 });

      expect(notificationsService.sendPush).not.toHaveBeenCalled();
    });

    it('sends push to every manager with a push token', async () => {
      const product = makeProduct({ lowStockThreshold: 5 });
      productModel.findOne.mockResolvedValue(product);
      stockModel.create.mockResolvedValue({ _id: { toString: () => 'e1' }, createdAt: new Date() });

      userModel.find.mockResolvedValue([
        makeManager('ExponentPushToken[aaa]'),
        makeManager('ExponentPushToken[bbb]'),
      ]);

      await service.recordCount(PRODUCT_ID, USER_ID, BUSINESS_ID, { quantity: 1 });

      const [messages] = notificationsService.sendPush.mock.calls[0];
      expect(messages).toHaveLength(2);
      expect(messages[0].to).toBe('ExponentPushToken[aaa]');
      expect(messages[1].to).toBe('ExponentPushToken[bbb]');
    });
  });
});
