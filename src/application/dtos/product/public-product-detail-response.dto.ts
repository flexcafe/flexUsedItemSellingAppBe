import { ApiProperty } from '@nestjs/swagger';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import type { PublicUserProfileData } from '../../../domain/repositories/points.repository.interface.js';
import { ProductResponseDto } from './product-response.dto.js';
import { ProductSellerSummaryDto } from './product-seller-summary.dto.js';

/** Public product detail screen payload (listing + seller summary + preferred spots). */
export class PublicProductDetailResponseDto extends ProductResponseDto {
  @ApiProperty({ type: ProductSellerSummaryDto })
  seller: ProductSellerSummaryDto;

  constructor(
    entity: ListingEntity,
    seller: PublicUserProfileData,
    createdAtDisplay: string,
  ) {
    super(entity, createdAtDisplay);
    this.seller = new ProductSellerSummaryDto(seller);
  }
}
