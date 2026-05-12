import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(productId: string): Promise<ProductResponseDto> {
    const row = await this.productRepository.findById(productId);
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return new ProductResponseDto(row);
  }
}
