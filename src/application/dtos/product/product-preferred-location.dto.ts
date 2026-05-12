import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProductPreferredLocationDto {
  @ApiProperty({
    example: 'Location 1',
    description:
      'Short label shown in UI (e.g. “Near office”). Cannot be blank.',
  })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiProperty({
    example: 'Pabedan Township, Yangon',
    description: 'Free-text address or area description. Cannot be blank.',
  })
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiPropertyOptional({
    example: 16.778,
    description: 'Optional WGS84 latitude for this preferred spot.',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 96.162,
    description: 'Optional WGS84 longitude for this preferred spot.',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
