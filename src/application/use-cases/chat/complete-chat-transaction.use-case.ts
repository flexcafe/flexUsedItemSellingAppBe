import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { ChatMessagePublisher } from './chat-message.publisher.js';

@Injectable()
export class CompleteChatTransactionUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    private readonly publisher: ChatMessagePublisher,
  ) {}

  async execute(
    userId: string,
    transactionId: string,
  ): Promise<TransactionData> {
    const tx = await this.chats.findTransactionById(transactionId);
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    if (tx.buyerId !== userId && tx.sellerId !== userId) {
      throw new ForbiddenException('Not part of this transaction');
    }
    const next = await this.chats.markTransactionCompletedByUser(
      transactionId,
      userId,
    );
    const message = await this.chats.createMessage({
      chatRoomId: next.chatRoomId,
      senderId: userId,
      type: MessageType.TRANSACTION_COMPLETED,
      content:
        next.status === TransactionStatus.COMPLETED
          ? 'Both sides marked transaction as completed.'
          : 'Transaction marked completed by one side. Waiting for the other side.',
      metadata: {
        transactionId: next.id,
        status: next.status,
        buyerCompleted: next.buyerCompleted,
        sellerCompleted: next.sellerCompleted,
      },
    });
    this.publisher.publish(
      next.chatRoomId,
      next.buyerId,
      next.sellerId,
      message,
      next.status === TransactionStatus.COMPLETED
        ? 'chat.transaction.completed'
        : userId === next.buyerId
          ? 'chat.transaction.completedByBuyer'
          : 'chat.transaction.completedBySeller',
    );
    return next;
  }
}
