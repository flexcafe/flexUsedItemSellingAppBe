import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import {
  CreateReviewDto,
  ReviewResponseDto,
} from '../../dtos/points/review.dto.js';

@Injectable()
export class CreateTransactionReviewUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(
    transactionId: string,
    reviewerId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const transaction =
      await this.pointsRepository.findTransactionReviewContext(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Reviews can only be submitted after transaction is completed',
      );
    }

    if (
      transaction.buyerId !== reviewerId &&
      transaction.sellerId !== reviewerId
    ) {
      throw new ForbiddenException(
        'Only buyer or seller can review this trade',
      );
    }

    const alreadyReviewed = await this.pointsRepository.hasReview(
      transactionId,
      reviewerId,
    );
    if (alreadyReviewed) {
      throw new ConflictException('You already reviewed this transaction');
    }

    const revieweeId =
      transaction.buyerId === reviewerId
        ? transaction.sellerId
        : transaction.buyerId;

    const review = await this.pointsRepository.createReviewAndAwardPoints({
      transactionId,
      reviewerId,
      revieweeId,
      stars: dto.stars,
      comment: dto.comment,
    });

    return new ReviewResponseDto(review);
  }
}
