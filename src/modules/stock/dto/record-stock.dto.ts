import { IsDefined, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RecordStockDto {
  @IsDefined()
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  aiIdentificationNote?: string;
}
