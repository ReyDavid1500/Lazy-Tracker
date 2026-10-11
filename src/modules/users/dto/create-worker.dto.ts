import { IsDefined, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkerDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(['worker', 'manager'])
  role?: 'worker' | 'manager';
}
