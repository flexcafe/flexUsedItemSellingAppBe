import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  USER_BLOCK_REPOSITORY,
  type IUserBlockRepository,
} from '../../../domain/repositories/user-block.repository.interface.js';
import { ProductFilterDto } from '../../dtos/product/product-filter.dto.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';
import { PaginatedResponseDto } from '../../dtos/common/index.js';
import { formatPublicListingCreatedLabel } from '../../utils/format-public-listing-created-label.js';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly userBlocks: IUserBlockRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(filter: ProductFilterDto, viewerUserId?: string) {
    const page = Math.max(1, Number(filter.page ?? 1));
    const limit = Math.max(1, Math.min(Number(filter.limit ?? 20), 50));
    const skip = (page - 1) * limit;
    const excludeSellerIds = viewerUserId
      ? await this.userBlocks.listExcludedUserIdsForViewer(viewerUserId)
      : undefined;
    const data = await this.productRepository.search({
      search: filter.search?.trim(),
      categoryId: filter.categoryId,
      latitude: filter.latitude,
      longitude: filter.longitude,
      radiusKm: filter.radiusKm,
      excludeSellerIds,
      skip,
      take: limit,
    });
    const timeZone = this.configService.get<string>(
      'LISTING_DISPLAY_TIMEZONE',
      'UTC',
    );
    const now = new Date();
    return new PaginatedResponseDto(
      data.rows.map((r) => {
        const dto = new ProductResponseDto(r);
        dto.createdAtDisplay = formatPublicListingCreatedLabel(r.createdAt, {
          now,
          timeZone,
        });
        return dto;
      }),
      data.total,
      page,
      limit,
    );
  }
}
