import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { DeleteProductDto } from '../../dtos/product/delete-product.dto.js';

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(
    userId: string,
    productId: string,
    dto: DeleteProductDto,
  ): Promise<void> {
    const listing = await this.productRepository.findById(productId);
    if (!listing) {
      throw new NotFoundException('Product not found');
    }
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    if (listing.status === ListingStatus.SOLD) {
      throw new ConflictException(
        'Sold listings cannot be deleted. Contact support if you need help.',
      );
    }
    const expected = listing.title.trim();
    const got = dto.confirmTitle.trim();
    if (got !== expected) {
      throw new BadRequestException(
        'Confirmation title does not match the listing title.',
      );
    }
    await this.productRepository.softDeleteBySeller(productId, userId);
  }
}
