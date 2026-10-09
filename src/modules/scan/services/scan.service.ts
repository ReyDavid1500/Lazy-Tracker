import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ProductsService } from '../../products/products.service.js';
import type { ScanImageDto } from '../dto/scan-image.dto.js';
import type { ScanResultDto } from '../dto/scan-result.dto.js';
import type { ScanResponseDto, MatchedProductDto } from '../dto/scan-response.dto.js';
import type { Product } from '../../products/index.js';

interface ProductJson {
  name: string;
  brand: string | null;
  sku: string | null;
  description: string | null;
}

const SYSTEM_PROMPT = `You are a product-identification assistant for a bakery inventory app.
When given a photo of a product, respond with ONLY a JSON object — no markdown, no explanation.
The JSON must exactly match this shape:
{
  "name": "<product name>",
  "brand": "<brand name or null>",
  "sku": "<barcode/SKU visible on packaging or null>",
  "description": "<one-sentence description or null>"
}
Be as specific as possible. Prefer "Dinkel Vollkornbrot 500g" over "Bread".
Never wrap the JSON in markdown. Never add explanatory text before or after.
If you cannot identify the product, set name to "Unknown product" and all other fields to null.`;

@Injectable()
export class ScanService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    this.client = new Anthropic({ apiKey });
  }

  /**
   * Full scan pipeline:
   * 1. Send image to Claude API → structured product JSON
   * 2. Search MongoDB for a matching product in this business
   * 3. Return both so the mobile app can branch on matchedProduct
   */
  async scan(dto: ScanImageDto, businessId: string): Promise<ScanResponseDto> {
    const identification = await this.#identify(dto);
    const matchedProduct = await this.#lookupProduct(businessId, identification);

    return { identification, matchedProduct };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  async #identify(dto: ScanImageDto): Promise<ScanResultDto> {
    let rawNote: string;

    try {
      const message = await this.client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: dto.mimeType,
                  data: dto.imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Identify this product and return the JSON.',
              },
            ],
          },
        ],
      });

      const firstBlock = message.content[0];

      if (!firstBlock || firstBlock.type !== 'text') {
        throw new Error('Unexpected response shape from Claude API');
      }

      rawNote = firstBlock.text.trim();
    } catch (err) {
      this.logger.error('Claude API call failed', err);
      throw new InternalServerErrorException('Product identification failed — AI service error');
    }

    let parsed: ProductJson;
    try {
      parsed = JSON.parse(rawNote) as ProductJson;
    } catch {
      this.logger.warn(`Claude returned non-JSON: ${rawNote}`);
      parsed = { name: 'Unknown product', brand: null, sku: null, description: null };
    }

    return {
      name: parsed.name ?? 'Unknown product',
      brand: parsed.brand ?? null,
      sku: parsed.sku ?? null,
      description: parsed.description ?? null,
      rawNote,
    };
  }

  async #lookupProduct(
    businessId: string,
    identification: ScanResultDto,
  ): Promise<MatchedProductDto | null> {
    if (identification.name === 'Unknown product') return null;

    const product = await this.productsService.findByAiResult(
      businessId,
      identification.name,
      identification.brand,
    );

    if (!product) return null;

    return this.#toMatchedProductDto(product);
  }

  #toMatchedProductDto(product: Product): MatchedProductDto {
    return {
      id: (product._id as { toString(): string }).toString(),
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      currentStock: product.currentStock,
      lowStockThreshold: product.lowStockThreshold,
    };
  }
}
