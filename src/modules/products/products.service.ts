import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './entities/product.entity.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateThresholdDto } from './dto/update-threshold.dto.js';
import type { UpdateIntervalDto } from './dto/update-interval.dto.js';

export type InventoryItemDto = {
  productId: string;
  name: string;
  brand: string | null;
  currentStock: number;
  lowStockThreshold: number;
  isLow: boolean;
  updateIntervalDays: number | null;
  stockLastUpdatedAt: Date | null;
};

type FindByAiResultParams = {
  businessId: string;
  name: string;
  brand: string | null;
};

export type ProductMatch = {
  product: Product;
  matchType: 'exact' | 'fuzzy';
  matchScore: number;
};

/** Minimum Jaccard similarity (0–1) to accept a fuzzy name match */
const SIMILARITY_THRESHOLD = 0.45;

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  /**
   * Searches for an existing product within a business using a priority chain:
   *
   * 1. Name + Brand case-insensitive exact match
   * 2. Name-only case-insensitive exact match
   * 3. Fuzzy token-overlap: tokenise both names, compute Jaccard similarity,
   *    return best candidate above SIMILARITY_THRESHOLD
   *
   * Steps 1–2 are O(1) indexed queries. Step 3 loads the full catalogue once
   * (typically a few dozen products per business) and scores in memory.
   */
  async findByAiResult({
    businessId,
    name,
    brand,
  }: FindByAiResultParams): Promise<ProductMatch | null> {
    const base = { businessId, isActive: true };
    const nameExact = { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') };

    // ── 1. Name + Brand exact match ────────────────────────────────────────
    if (brand) {
      const byNameBrandMatch = await this.productModel
        .findOne({
          ...base,
          name: nameExact,
          brand: { $regex: new RegExp(`^${escapeRegex(brand)}$`, 'i') },
        })
        .exec();

      if (byNameBrandMatch) return { product: byNameBrandMatch, matchType: 'exact', matchScore: 1 };
    }

    // ── 2. Name-only exact match ───────────────────────────────────────────
    const byNameMatch = await this.productModel
      .findOne({ ...base, name: nameExact })
      .exec();

    if (byNameMatch) return { product: byNameMatch, matchType: 'exact', matchScore: 1 };

    // ── 3. Fuzzy token-overlap across full catalogue ───────────────────────
    const allProducts = await this.productModel
      .find(base, { name: 1, brand: 1 })
      .exec();

    if (allProducts.length === 0) return null;

    const queryTokens = tokenise(name);
    const queryTokensWithBrand = brand
      ? new Set([...queryTokens, ...tokenise(brand)])
      : queryTokens;

    let bestScore = 0;
    let bestProductId: Types.ObjectId | null = null;

    for (const product of allProducts) {
      const candidateText = [product.name, product.brand].filter(Boolean).join(' ');
      const candidateTokens = tokenise(candidateText);
      const score = jaccardSimilarity(queryTokensWithBrand, candidateTokens);

      if (score > bestScore) {
        bestScore = score;
        bestProductId = product._id;
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD && bestProductId) {
      const full = await this.productModel.findOne({ ...base, _id: bestProductId }).exec();
      if (full) return { product: full, matchType: 'fuzzy', matchScore: bestScore };
    }

    return null;
  }

  async create(dto: CreateProductDto, businessId: string): Promise<Product> {
    return this.productModel.create({
      businessId: new Types.ObjectId(businessId),
      name: dto.name,
      brand: dto.brand ?? null,
      currentStock: dto.initialStock ?? 0,
      lowStockThreshold: 3,
      stockLastUpdatedAt: dto.initialStock !== undefined ? new Date() : null,
      imageUrl: null,
      isActive: true,
    });
  }

  async getInventory(businessId: string): Promise<InventoryItemDto[]> {
    const products = await this.productModel
      .find({ businessId, isActive: true })
      .sort({ name: 1 })
      .exec();

    return products.map((p) => ({
      productId: (p._id as { toString(): string }).toString(),
      name: p.name,
      brand: p.brand,
      currentStock: p.currentStock,
      lowStockThreshold: p.lowStockThreshold,
      isLow: p.currentStock <= p.lowStockThreshold,
      updateIntervalDays: p.updateIntervalDays ?? null,
      stockLastUpdatedAt: p.stockLastUpdatedAt ?? null,
    }));
  }

  async updateThreshold(
    productId: string,
    businessId: string,
    dto: UpdateThresholdDto,
  ): Promise<Product> {
    const updatedProduct = await this.productModel.findOneAndUpdate(
      { _id: productId, businessId, isActive: true },
      { $set: { lowStockThreshold: dto.lowStockThreshold } },
      { returnDocument: 'after' },
    );

    if (!updatedProduct) throw new NotFoundException('Product not found');

    return updatedProduct;
  }

  async updateInterval(
    productId: string,
    businessId: string,
    dto: UpdateIntervalDto,
  ): Promise<void> {
    const updated = await this.productModel.findOneAndUpdate(
      { _id: productId, businessId, isActive: true },
      { $set: { updateIntervalDays: dto.updateIntervalDays ?? null } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new NotFoundException('Product not found');
  }

  /** Manager-only: soft-delete a product by marking it inactive. */
  async deactivateProduct(productId: string, businessId: string): Promise<void> {
    const deactivated = await this.productModel.findOneAndUpdate(
      { _id: productId, businessId, isActive: true },
      { $set: { isActive: false } },
    );

    if (!deactivated) throw new NotFoundException('Product not found');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STOP_WORDS = new Set([
  'the', 'and', 'or', 'with', 'von', 'und', 'mit', 'de', 'la', 'le',
  'du', 'des', 'der', 'die', 'das',
]);

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return intersection / union;
}
