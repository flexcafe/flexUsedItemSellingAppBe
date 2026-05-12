import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface.js';
import { CreateProductDto } from '../../dtos/product/create-product.dto.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';
import {
  assertActiveCategory,
  assertNotBlank,
  assertProductInputRules,
} from './_helpers.js';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await assertActiveCategory(this.categoryRepository, dto.categoryId);
    const title = assertNotBlank(dto.title, 'title');
    const description = assertNotBlank(dto.description, 'description');
    if (dto.directTradeLocation !== undefined) {
      assertNotBlank(dto.directTradeLocation, 'directTradeLocation');
    }
    for (const [index, loc] of (dto.preferredLocations ?? []).entries()) {
      if (!loc) {
        throw new BadRequestException(
          `preferredLocations[${index}] is required`,
        );
      }
      assertNotBlank(loc.label, `preferredLocations[${index}].label`);
      assertNotBlank(loc.address, `preferredLocations[${index}].address`);
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

    const row = await this.productRepository.create({
      sellerId: userId,
      categoryId: dto.categoryId,
      title,
      description,
      price: dto.price,
      condition: dto.condition ?? ListingCondition.GOOD,
      status: ListingStatus.ACTIVE,
      paymentMethods: dto.paymentMethods,
      directTradeLocation: dto.directTradeLocation?.trim() ?? null,
      directTradeLatitude: dto.directTradeLatitude ?? null,
      directTradeLongitude: dto.directTradeLongitude ?? null,
      mapScreenshotUrl: dto.mapScreenshotUrl ?? null,
      nearbyLandmarks: dto.nearbyLandmarks ?? null,
      preferredTradeTime: dto.preferredTradeTime ?? null,
      isDeliveryAvailable: dto.isDeliveryAvailable,
      deliveryFeePayer: dto.deliveryFeePayer ?? null,
      images: dto.images,
      preferredLocations: dto.preferredLocations,
    });
    return new ProductResponseDto(row);
  }
}
