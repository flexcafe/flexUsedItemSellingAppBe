import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller.js';
import { CreateListingUseCase } from '../../../application/use-cases/listing/create-listing.use-case.js';
import { GetListingUseCase } from '../../../application/use-cases/listing/get-listing.use-case.js';
import { ListListingsUseCase } from '../../../application/use-cases/listing/list-listings.use-case.js';
import { UpdateListingUseCase } from '../../../application/use-cases/listing/update-listing.use-case.js';
import { DeleteListingUseCase } from '../../../application/use-cases/listing/delete-listing.use-case.js';
import { ListingRepository } from '../../../infrastructure/repositories/listing.repository.js';
import { CategoryRepository } from '../../../infrastructure/repositories/category.repository.js';
import { LISTING_REPOSITORY } from '../../../domain/repositories/listing.repository.interface.js';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface.js';

@Module({
  controllers: [ListingController],
  providers: [
    CreateListingUseCase,
    GetListingUseCase,
    ListListingsUseCase,
    UpdateListingUseCase,
    DeleteListingUseCase,
    {
      provide: LISTING_REPOSITORY,
      useClass: ListingRepository,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
  ],
  exports: [GetListingUseCase],
})
export class ListingModule {}
