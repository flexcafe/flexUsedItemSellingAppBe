import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { LISTING_REPOSITORY } from '../../../domain/repositories/listing.repository.interface.js';
import type { IListingRepository } from '../../../domain/repositories/listing.repository.interface.js';
import { UpdateListingDto } from '../../dtos/listing/update-listing.dto.js';

@Injectable()
export class UpdateListingUseCase {
  private readonly logger = new Logger(UpdateListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: IListingRepository,
  ) {}

  async execute(
    id: string,
    sellerId: string,
    dto: UpdateListingDto,
  ): Promise<ListingEntity> {
    const listing = await this.listingRepository.findById(id);
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    listing.assertOwnership(sellerId);
    listing.assertCanBeModified();

    this.logger.log(`Updating listing ${id}`);
    return this.listingRepository.update(id, dto);
  }
}
