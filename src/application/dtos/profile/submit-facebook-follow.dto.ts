import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitFacebookFollowDto {
  @ApiProperty({ example: 'Aung Aung' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  facebookName: string;

  @ApiProperty({ example: 'https://www.facebook.com/aung.aung.123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  facebookProfileUrl: string;

  @ApiProperty({ example: 'https://www.facebook.com/your-brand-page' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  facebookPageUrl: string;
}
