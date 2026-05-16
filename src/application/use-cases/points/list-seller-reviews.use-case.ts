import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { SellerReviewsPageDto } from '../../dtos/points/seller-reviews.dto.js';
import { PaginationQueryDto } from '../../dtos/common/pagination.dto.js';

@Injectable()
export class ListSellerReviewsUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(
    sellerId: string,
    query: PaginationQueryDto,
  ): Promise<SellerReviewsPageDto> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.max(1, Math.min(Number(query.limit ?? 20), 50));
    const skip = (page - 1) * limit;

    const result = await this.pointsRepository.getSellerReviews(
      sellerId,
      skip,
      limit,
    );
    if (!result) {
      throw new NotFoundException('User not found');
    }

    return new SellerReviewsPageDto(result, page, limit);
  }
}
