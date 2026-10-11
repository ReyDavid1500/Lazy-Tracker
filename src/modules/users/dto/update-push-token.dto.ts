import { IsDefined, IsString, IsNotEmpty } from 'class-validator';

export class UpdatePushTokenDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  pushToken: string;
}
