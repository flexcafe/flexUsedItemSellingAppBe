import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { LISTING_REPOSITORY } from '../../../domain/repositories/listing.repository.interface.js';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface.js';
import type { IListingRepository } from '../../../domain/repositories/listing.repository.interface.js';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface.js';
import { CreateListingDto } from '../../dtos/listing/create-listing.dto.js';

@Injectable()
export class CreateListingUseCase {
  private readonly logger = new Logger(CreateListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: IListingRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    sellerId: string,
    dto: CreateListingDto,
  ): Promise<ListingEntity> {
    this.logger.log(`Creating listing: "${dto.title}" by seller ${sellerId}`);

    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException(
        `Category with ID ${dto.categoryId} not found`,
      );
    }

    return this.listingRepository.create({
      title: dto.title,
      description: dto.description,
      price: dto.price,
      condition: dto.condition,
      status: ListingStatus.DRAFT,
      paymentMethods: dto.paymentMethods,
      directTradeLocation: dto.directTradeLocation,
      directTradeLatitude: dto.directTradeLatitude,
      directTradeLongitude: dto.directTradeLongitude,
      nearbyLandmarks: dto.nearbyLandmarks,
      preferredTradeTime: dto.preferredTradeTime,
      mapScreenshotUrl: dto.mapScreenshotUrl,
      isDeliveryAvailable: dto.isDeliveryAvailable,
      deliveryFeePayer: dto.deliveryFeePayer,
      imageUrls: dto.imageUrls ?? [],
      sellerId,
      categoryId: dto.categoryId,
    });
  }
}
