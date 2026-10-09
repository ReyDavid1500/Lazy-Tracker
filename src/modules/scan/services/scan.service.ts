import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { ScanImageDto } from '../dto/scan-image.dto.js';
import type { ScanResultDto } from '../dto/scan-result.dto.js';


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
If you cannot identify the product, set name to "Unknown product" and all other fields to null.`;

@Injectable()
export class ScanService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ScanService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    this.client = new Anthropic({ apiKey });
  }

  async identifyProduct(dto: ScanImageDto): Promise<ScanResultDto> {
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
      this.logger.warn(`Claude returned non-JSON text: ${rawNote}`);
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
}
