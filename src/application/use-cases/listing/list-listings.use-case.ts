import { Inject, Injectable } from '@nestjs/common';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { LISTING_REPOSITORY } from '../../../domain/repositories/listing.repository.interface.js';
import type {
  IListingRepository,
  ListingFilter,
} from '../../../domain/repositories/listing.repository.interface.js';

@Injectable()
export class ListListingsUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: IListingRepository,
  ) {}

  async execute(
    filter: ListingFilter,
  ): Promise<{ listings: ListingEntity[]; total: number }> {
    return this.listingRepository.findWithFilters(filter);
  }
}
