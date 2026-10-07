import {
  IsDefined,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { UserRole } from '../../../users/index.js';

export class RegisterDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn(['worker', 'manager'] as UserRole[])
  role?: UserRole;
}
