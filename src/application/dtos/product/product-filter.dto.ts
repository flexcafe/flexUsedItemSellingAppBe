import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ProductFilterDto {
  @ApiPropertyOptional({
    example: 'iphone',
    description:
      'Case-insensitive substring match on listing title and description (SQL ILIKE).',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Restrict results to a single leaf or root category UUID.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 16.778,
    description:
      'Buyer/user latitude (WGS84). When both latitude and longitude are set, catalog is ordered nearest-first using each listing’s direct-trade coordinates.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 96.162,
    description:
      'Buyer/user longitude (WGS84). Must be sent together with latitude for geo ordering.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Optional radius in kilometers. When set, requires latitude and longitude; listings outside the radius are excluded from results and total count.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: '1-based page index (minimum 1).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Page size (minimum 1, maximum 50).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
