import { IsDefined, IsIn, IsString, IsNotEmpty } from 'class-validator';

/** Valid image MIME types the mobile app may send. */
export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export class ScanImageDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @IsDefined()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  mimeType: ImageMimeType;
}
