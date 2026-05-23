import {
  BadRequestException,
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
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Reviews can only be submitted after transaction completion',
      );
    }
    return this.createTransactionReviewUseCase.execute(
      transactionId,
      userId,
      dto,
    );
  }
}
