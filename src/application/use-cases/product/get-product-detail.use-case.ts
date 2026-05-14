import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';
import { formatPublicListingCreatedLabel } from '../../utils/format-public-listing-created-label.js';

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(productId: string): Promise<ProductResponseDto> {
    const row = await this.productRepository.findById(productId);
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    const dto = new ProductResponseDto(row);
    const timeZone = this.configService.get<string>(
      'LISTING_DISPLAY_TIMEZONE',
      'UTC',
    );
    dto.createdAtDisplay = formatPublicListingCreatedLabel(row.createdAt, {
      now: new Date(),
      timeZone,
    });
    return dto;
  }
}
