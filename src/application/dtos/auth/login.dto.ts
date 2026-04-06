import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '+959123456789',
    required: false,
    description: 'Use this with password for phone-based login',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: '100012345678901',
    required: false,
    description: 'Use this with password for Facebook ID-based login',
  })
  @IsString()
  @IsOptional()
  facebookId?: string;

  @ApiProperty({ example: 'secureP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
