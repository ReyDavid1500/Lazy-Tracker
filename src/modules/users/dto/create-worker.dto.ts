import { IsDefined, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateWorkerDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  password: string;
}
