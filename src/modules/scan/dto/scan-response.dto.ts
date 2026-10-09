import type { ScanResultDto } from './scan-result.dto.js';

/** Slim product view returned inside the scan response — no internal fields. */
export class MatchedProductDto {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  currentStock: number;
  lowStockThreshold: number;
}

/**
 * Full response from POST /scan.
 * - `identification` — what Claude extracted from the image.
 * - `matchedProduct` — existing DB record if one matched, or null (new product).
 *
 * The mobile app uses this to decide:
 *   matchedProduct != null  →  "Confirm stock count for <name>"
 *   matchedProduct == null  →  "New product — add to inventory?"
 */
export class ScanResponseDto {
  identification: ScanResultDto;
  matchedProduct: MatchedProductDto | null;
}
