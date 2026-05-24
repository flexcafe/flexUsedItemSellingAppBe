import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';

export class MyProductsFilterDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: '1-based page index for the authenticated seller’s listings.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description:
      'Page size (1–50). Same semantics as public catalog pagination.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ListingStatus,
    description:
      'Optional seller-side status filter (e.g. SOLD to view sold listings only).',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
