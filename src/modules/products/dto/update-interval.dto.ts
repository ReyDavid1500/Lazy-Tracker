import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateIntervalDto {
  /** Days between expected stock counts. Null clears the interval. */
  @IsOptional()
  @IsInt()
  @Min(1)
  updateIntervalDays: number | null;
}
