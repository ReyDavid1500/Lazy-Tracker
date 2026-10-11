import { IsNumber, Min } from 'class-validator';

export class UpdateThresholdDto {
  @IsNumber()
  @Min(0)
  lowStockThreshold: number;
}
