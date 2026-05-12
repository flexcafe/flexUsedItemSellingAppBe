import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface.js';
import { UpdateProductDto } from '../../dtos/product/update-product.dto.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';
import {
  assertActiveCategory,
  assertNotBlank,
  assertProductInputRules,
} from './_helpers.js';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const title = dto.title ? assertNotBlank(dto.title, 'title') : undefined;
    const description = dto.description
      ? assertNotBlank(dto.description, 'description')
      : undefined;
    const directTradeLocation =
      dto.directTradeLocation !== undefined
        ? assertNotBlank(dto.directTradeLocation, 'directTradeLocation')
        : undefined;
    if (dto.preferredLocations) {
      dto.preferredLocations.forEach((loc, index) => {
        assertNotBlank(loc.label, `preferredLocations[${index}].label`);
        assertNotBlank(loc.address, `preferredLocations[${index}].address`);
      });
    }

    if (dto.categoryId) {
      await assertActiveCategory(this.categoryRepository, dto.categoryId);
    }

    assertProductInputRules({
      images: dto.images,
      preferredLocations: dto.preferredLocations,
      paymentMethods: dto.paymentMethods,
      isDeliveryAvailable: dto.isDeliveryAvailable,
      deliveryFeePayer: dto.deliveryFeePayer ?? null,
      directTradeLatitude: dto.directTradeLatitude ?? null,
      directTradeLongitude: dto.directTradeLongitude ?? null,
    });

    const row = await this.productRepository.updateBySeller(productId, userId, {
      categoryId: dto.categoryId,
      title,
      description,
      price: dto.price,
      condition: dto.condition,
      status: dto.status,
      paymentMethods: dto.paymentMethods,
      directTradeLocation,
      directTradeLatitude: dto.directTradeLatitude,
      directTradeLongitude: dto.directTradeLongitude,
      mapScreenshotUrl: dto.mapScreenshotUrl,
      nearbyLandmarks: dto.nearbyLandmarks,
      preferredTradeTime: dto.preferredTradeTime,
      isDeliveryAvailable: dto.isDeliveryAvailable,
      deliveryFeePayer: dto.deliveryFeePayer,
      images: dto.images,
      preferredLocations: dto.preferredLocations,
    });
    return new ProductResponseDto(row);
  }
}
