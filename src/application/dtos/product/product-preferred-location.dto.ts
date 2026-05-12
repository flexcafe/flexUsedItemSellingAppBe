import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProductPreferredLocationDto {
  @ApiProperty({ example: 'Location 1' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiProperty({ example: 'Pabedan Township, Yangon' })
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiPropertyOptional({ example: 16.778 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 96.162 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
