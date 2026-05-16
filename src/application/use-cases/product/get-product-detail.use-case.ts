import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PublicProductDetailResponseDto } from '../../dtos/product/public-product-detail-response.dto.js';
import { formatPublicListingCreatedLabel } from '../../utils/format-public-listing-created-label.js';

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(productId: string): Promise<PublicProductDetailResponseDto> {
    const listing = await this.productRepository.findById(productId);
    if (!listing) {
      throw new NotFoundException('Product not found');
    }

    const seller = await this.pointsRepository.getPublicUserProfile(
      listing.sellerId,
    );
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const timeZone = this.configService.get<string>(
      'LISTING_DISPLAY_TIMEZONE',
      'UTC',
    );
    const createdAtDisplay = formatPublicListingCreatedLabel(listing.createdAt, {
      now: new Date(),
      timeZone,
    });

    return new PublicProductDetailResponseDto(
      listing,
      seller,
      createdAtDisplay,
    );
  }
}
