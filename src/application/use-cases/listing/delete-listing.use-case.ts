import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LISTING_REPOSITORY } from '../../../domain/repositories/listing.repository.interface.js';
import type { IListingRepository } from '../../../domain/repositories/listing.repository.interface.js';

@Injectable()
export class DeleteListingUseCase {
  private readonly logger = new Logger(DeleteListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: IListingRepository,
  ) {}

  async execute(id: string, sellerId: string): Promise<boolean> {
    const listing = await this.listingRepository.findById(id);
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    listing.assertOwnership(sellerId);

    this.logger.log(`Soft-deleting listing ${id}`);
    return this.listingRepository.delete(id);
  }
}
