import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ProductsService } from '../../products/products.service.js';
import type { ScanImageDto } from '../dto/scan-image.dto.js';
import type { ScanResultDto } from '../dto/scan-result.dto.js';
import type { ScanResponseDto, MatchedProductDto } from '../dto/scan-response.dto.js';
import type { Product } from '../../products/index.js';

type ProductJson = {
  name: string;
  brand: string | null;
  sku: string | null;
  description: string | null;
};

const SYSTEM_PROMPT = `You are a product-identification assistant for a food/bakery inventory app.
When given a photo of a product, respond with ONLY a JSON object — no markdown, no explanation.
The JSON must exactly match this shape:
{
  "name": "<product name>",
  "brand": "<brand name or null>",
  "sku": "<barcode or SKU or null>",
  "description": "<one-sentence description or null>"
}

Rules:
1. SKU/barcode: scan the entire image carefully for any barcode numbers, EAN-13, UPC-A, QR codes, or SKU codes printed on the packaging. If you see ANY digits that look like a barcode (typically 8–14 digits), put them in "sku". This is the most important field for avoiding duplicates.
2. Name: be specific and consistent. Include weight/volume if printed (e.g. "Dinkel Vollkornbrot 500g"). Always use the name as printed on the label — do not translate or paraphrase.
3. Brand: extract exactly as printed. If the brand is part of the product name, also include it separately in "brand".
4. Never wrap the JSON in markdown. Never add explanatory text before or after.
5. If you cannot identify the product at all, set name to "Unknown product" and all other fields to null.`;

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

  async scan(dto: ScanImageDto, businessId: string): Promise<ScanResponseDto> {
    const identification = await this.#identify(dto);
    const matchedProduct = await this.#lookupProduct(businessId, identification);

    return { identification, matchedProduct };
  }

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

    const match = await this.productsService.findByAiResult({
      businessId,
      name: identification.name,
      brand: identification.brand,
      sku: identification.sku,
    });

    if (!match) return null;

    return this.#toMatchedProductDto(match.product, match.matchType, match.matchScore);
  }

  #toMatchedProductDto(
    product: Product,
    matchType: 'sku' | 'exact' | 'fuzzy',
    matchScore: number,
  ): MatchedProductDto {
    return {
      id: (product._id as { toString(): string }).toString(),
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      currentStock: product.currentStock,
      lowStockThreshold: product.lowStockThreshold,
      matchType,
      matchScore,
    };
  }
}
