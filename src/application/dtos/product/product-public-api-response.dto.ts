import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto.js';

/**
 * Concrete pagination wrapper so Swagger UI shows `items[].createdAtDisplay`
 * (generic PaginatedResponseDto + allOf response schemas do not render nested fields).
 */
export class PaginatedProductResponseDto {
  @ApiProperty({
    type: ProductResponseDto,
    isArray: true,
    description:
      'Each item may include `createdAtDisplay` on public catalog routes.',
  })
  items: ProductResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

/** Swagger response shape for GET /client/products (public catalog). */
export class ApiResponsePublicProductListDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Products retrieved' })
  message: string;

  @ApiPropertyOptional({
    example: 'Asia/Yangon',
    description:
      'IANA timezone used for each item `createdAtDisplay` (`LISTING_DISPLAY_TIMEZONE`, default UTC).',
  })
  listingDisplayTimezone?: string;

  @ApiProperty({ type: PaginatedProductResponseDto })
  data: PaginatedProductResponseDto;

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-14T14:00:00.000Z',
  })
  timestamp: string;
}

/** Swagger response shape for GET /client/products/:productId (public detail). */
export class ApiResponsePublicProductDetailDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Product detail retrieved' })
  message: string;

  @ApiPropertyOptional({
    example: 'Asia/Yangon',
    description:
      'IANA timezone used for `data.createdAtDisplay` (`LISTING_DISPLAY_TIMEZONE`, default UTC).',
  })
  listingDisplayTimezone?: string;

  @ApiProperty({ type: ProductResponseDto })
  data: ProductResponseDto;

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-14T14:00:00.000Z',
  })
  timestamp: string;
}
