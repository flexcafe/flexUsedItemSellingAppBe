import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { LISTING_REPOSITORY } from '../../../domain/repositories/listing.repository.interface.js';
import type { IListingRepository } from '../../../domain/repositories/listing.repository.interface.js';

@Injectable()
export class GetListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: IListingRepository,
  ) {}

  async execute(id: string): Promise<ListingEntity> {
    const listing = await this.listingRepository.findById(id);
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }
    return listing;
  }

  async findBySeller(sellerId: string): Promise<ListingEntity[]> {
    return this.listingRepository.findBySellerId(sellerId);
  }
}
