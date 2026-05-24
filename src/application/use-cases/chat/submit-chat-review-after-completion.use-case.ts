import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { CreateTransactionReviewUseCase } from '../points/create-transaction-review.use-case.js';
import type { CreateReviewDto } from '../../dtos/points/review.dto.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { requireActiveChatUser } from './_helpers.js';

@Injectable()
export class SubmitChatReviewAfterCompletionUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly createTransactionReviewUseCase: CreateTransactionReviewUseCase,
  ) {}

  async execute(userId: string, transactionId: string, dto: CreateReviewDto) {
    await requireActiveChatUser(this.users, userId);
    const transaction = await this.chats.findTransactionById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('Not part of this transaction');
    }

    const isBuyer = transaction.buyerId === userId;
    if (isBuyer && !transaction.buyerCompleted) {
      throw new BadRequestException(
        'Submit your transaction completion first before reviewing',
      );
    }
    if (!isBuyer && !transaction.sellerCompleted) {
      throw new BadRequestException(
        'Submit your transaction completion first before reviewing',
      );
    }

    const allowedStatuses = new Set<TransactionStatus>([
      TransactionStatus.BUYER_COMPLETED,
      TransactionStatus.SELLER_COMPLETED,
      TransactionStatus.COMPLETED,
    ]);
    if (!allowedStatuses.has(transaction.status)) {
      throw new BadRequestException(
        'Reviews can only be submitted after you have completed the transaction',
      );
    }
    return this.createTransactionReviewUseCase.execute(
      transactionId,
      userId,
      dto,
    );
  }
}
