/**
 * The structured product data returned by ScanService after Claude API analysis.
 * All fields except `name` are optional — Claude may not always identify them.
 */
export class ScanResultDto {
  name: string;

  brand: string | null;

  sku: string | null;

  description: string | null;

  rawNote: string;
}
