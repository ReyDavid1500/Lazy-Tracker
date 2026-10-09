import { IsDefined, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  password: string;
}
