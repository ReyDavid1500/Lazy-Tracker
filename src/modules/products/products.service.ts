import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './entities/product.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  /**
   * Searches for an existing product within a business by the AI-returned name and brand.
   * Uses case-insensitive regex so minor capitalisation differences still match.
   * Brand match is optional — if Claude didn't identify a brand we skip that filter.
   *
   * @returns The best-matching active product, or null if none found.
   */
  async findByAiResult(
    businessId: string,
    name: string,
    brand: string | null,
  ): Promise<Product | null> {
    const query: Record<string, unknown> = {
      businessId,
      isActive: true,
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
    };

    if (brand) {
      query['brand'] = { $regex: new RegExp(`^${escapeRegex(brand)}$`, 'i') };
    }

    return this.productModel.findOne(query).exec();
  }
}

/** Escapes special regex characters so product names like "C&C Brot" are safe. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
