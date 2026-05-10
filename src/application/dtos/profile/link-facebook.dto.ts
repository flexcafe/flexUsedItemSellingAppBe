import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LinkFacebookDto {
  @ApiProperty({ example: '100012345678901' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  facebookId: string;

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
}
