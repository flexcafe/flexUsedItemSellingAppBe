import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import { PaginatedResponseDto } from '../../dtos/common/index.js';
import { MyProductsFilterDto } from '../../dtos/product/my-products-filter.dto.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';

@Injectable()
export class ListMyProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(
    userId: string,
    filter: MyProductsFilterDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const page = Math.max(1, Number(filter.page ?? 1));
    const limit = Math.max(1, Math.min(Number(filter.limit ?? 20), 50));
    const skip = (page - 1) * limit;
    const data = await this.productRepository.findBySeller({
      sellerId: userId,
      status: filter.status,
      skip,
      take: limit,
    });
    return new PaginatedResponseDto(
      data.rows.map((r) => new ProductResponseDto(r)),
      data.total,
      page,
      limit,
    );
  }
}
