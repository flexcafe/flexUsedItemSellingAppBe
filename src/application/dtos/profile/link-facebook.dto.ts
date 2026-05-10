import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LinkFacebookDto {
  @ApiProperty({
    example: 'EAABsbCS1iHgBAJZ...',
    description:
      'Facebook user access token from the client Facebook Login flow',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  facebookAccessToken: string;

  @ApiProperty({ example: 'https://www.facebook.com/aung.aung.123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  facebookProfileUrl: string;
}
