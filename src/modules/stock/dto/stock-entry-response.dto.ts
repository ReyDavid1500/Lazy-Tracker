export class StockEntryResponseDto {
  id: string;
  productId: string;
  quantity: number;
  alertFired: boolean;
  createdAt: Date;
}
