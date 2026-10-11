import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './entities/product.entity.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateThresholdDto } from './dto/update-threshold.dto.js';

export type InventoryItemDto = {
  productId: string;
  name: string;
  brand: string | null;
  sku: string | null;
  currentStock: number;
  lowStockThreshold: number;
  isLow: boolean;
};

type FindByAiResultParams = {
  businessId: string;
  name: string;
  brand: string | null;
  sku: string | null;
};

export type ProductMatch = {
  product: Product;
  matchType: 'sku' | 'exact' | 'fuzzy';
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
   * 1. SKU exact-match  (strongest signal — barcodes don't lie)
   * 2. Name + Brand case-insensitive exact-match
   * 3. Name-only case-insensitive exact-match
   * 4. Fuzzy token-overlap: tokenise both names, compute Jaccard similarity,
   *    return best candidate above SIMILARITY_THRESHOLD
   *
   * Steps 1–3 are O(1) indexed queries. Step 4 loads the full catalogue once
   * (typically a few dozen products per business) and scores in memory.
   */
  async findByAiResult({
    businessId,
    name,
    brand,
    sku,
  }: FindByAiResultParams): Promise<ProductMatch | null> {
    const base = { businessId, isActive: true };

    // ── 1. SKU exact match ─────────────────────────────────────────────────
    if (sku) {
      const bySkuMatch = await this.productModel
        .findOne({ ...base, sku: { $regex: new RegExp(`^${escapeRegex(sku)}$`, 'i') } })
        .exec();

      if (bySkuMatch) return { product: bySkuMatch, matchType: 'sku', matchScore: 1 };
    }

    // ── 2. Name + Brand exact match ────────────────────────────────────────
    const nameExact = { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') };

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

    // ── 3. Name-only exact match ───────────────────────────────────────────
    const byNameMatch = await this.productModel
      .findOne({ ...base, name: nameExact })
      .exec();

    if (byNameMatch) return { product: byNameMatch, matchType: 'exact', matchScore: 1 };

    // ── 4. Fuzzy token-overlap across full catalogue ───────────────────────
    const allProducts = await this.productModel
      .find(base, { name: 1, brand: 1, sku: 1 })
      .exec();

    if (allProducts.length === 0) return null;

    const queryTokens = tokenise(name);
    // If AI also gave a brand, append it so brand words strengthen the match
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
      // Reload the full document so callers get all fields
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
      sku: dto.sku ?? null,
      currentStock: dto.initialStock ?? 0,
      lowStockThreshold: 3,
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
      sku: p.sku,
      currentStock: p.currentStock,
      lowStockThreshold: p.lowStockThreshold,
      isLow: p.currentStock <= p.lowStockThreshold,
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

/**
 * Split a string into a set of lowercase tokens.
 * Strips punctuation, filler words, and size suffixes so that
 * "500g" vs "400g" differences don't dominate the similarity score.
 */
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

/**
 * Jaccard similarity = |A ∩ B| / |A ∪ B|
 * Returns 0–1. Two identical token sets → 1.0.
 */
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
