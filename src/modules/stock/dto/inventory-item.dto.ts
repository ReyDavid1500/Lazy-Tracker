/** One product row in the manager's inventory dashboard. */
export class InventoryItemDto {
  productId: string;
  name: string;
  brand: string | null;
  currentStock: number;
  lowStockThreshold: number;
  isLow: boolean;
}
