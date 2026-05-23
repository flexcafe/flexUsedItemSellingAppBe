import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
  type UpdateProductData,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface.js';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { UpdateProductDto } from '../../dtos/product/update-product.dto.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';
import {
  assertActiveCategory,
  assertListingMeetingLocationsEditable,
  assertNotBlank,
  assertProductInputRules,
  isUpdatingDirectTradeMeetingFields,
  mergeListingDeliveryForUpdate,
} from './_helpers.js';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
  ) {}

  async execute(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const existing = await this.productRepository.findByIdForSeller(
      productId,
      userId,
    );
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Product not found');
    }

    if (isUpdatingDirectTradeMeetingFields(dto)) {
      await assertListingMeetingLocationsEditable(this.chats, productId);
    }

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

    if (
      dto.isDeliveryAvailable === false &&
      dto.deliveryFeePayer !== undefined &&
      dto.deliveryFeePayer !== null
    ) {
      throw new BadRequestException(
        'deliveryFeePayer is only allowed when delivery is available',
      );
    }

    const mergedDelivery = mergeListingDeliveryForUpdate(existing, dto);

    assertProductInputRules({
      images: dto.images,
      preferredLocations: dto.preferredLocations,
      paymentMethods: dto.paymentMethods,
      isDeliveryAvailable: dto.isDeliveryAvailable,
      deliveryFeePayer:
        dto.deliveryFeePayer !== undefined ? dto.deliveryFeePayer : undefined,
      deliveryEffective: mergedDelivery,
      directTradeLatitude: dto.directTradeLatitude ?? null,
      directTradeLongitude: dto.directTradeLongitude ?? null,
    });

    const updatePayload: UpdateProductData = {
      categoryId: dto.categoryId,
      title,
      description,
      condition: dto.condition,
      status: dto.status,
      paymentMethods: dto.paymentMethods,
      directTradeLocation,
      directTradeLatitude: dto.directTradeLatitude,
      directTradeLongitude: dto.directTradeLongitude,
      mapScreenshotUrl: dto.mapScreenshotUrl,
      nearbyLandmarks: dto.nearbyLandmarks,
      preferredTradeTime: dto.preferredTradeTime,
      images: dto.images,
      preferredLocations: dto.preferredLocations,
    };

    if (
      dto.isDeliveryAvailable !== undefined ||
      dto.deliveryFeePayer !== undefined
    ) {
      updatePayload.isDeliveryAvailable = mergedDelivery.isDeliveryAvailable;
      updatePayload.deliveryFeePayer = mergedDelivery.deliveryFeePayer;
    }

    const row = await this.productRepository.updateBySeller(
      productId,
      userId,
      updatePayload,
    );
    return new ProductResponseDto(row);
  }
}
