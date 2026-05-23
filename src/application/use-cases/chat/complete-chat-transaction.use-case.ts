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
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import {
  assertTransactionCompletable,
  requireActiveChatUser,
} from './_helpers.js';
import {
  hasUserMarkedTransactionComplete,
  stopLiveLocationShareForCompletingUser,
} from './_location-share.helper.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class CompleteChatTransactionUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
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
    await requireActiveChatUser(this.users, userId);
    if (hasUserMarkedTransactionComplete(tx, userId)) {
      return tx;
    }
    await assertTransactionCompletable(this.chats, tx);
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
    if (next.status === TransactionStatus.COMPLETED) {
      const stoppedCount = await this.chats.stopAllLocationSharesForChatRoom(
        next.chatRoomId,
      );
      if (stoppedCount > 0) {
        const locationMessage = await this.chats.createMessage({
          chatRoomId: next.chatRoomId,
          senderId: userId,
          type: MessageType.LOCATION_SHARING_STOPPED,
          content:
            'Location sharing stopped for both parties because the transaction was completed.',
          metadata: {
            transactionId: next.id,
            stoppedCount,
            reason: 'transaction_completed',
          },
        });
        this.publisher.publish(
          next.chatRoomId,
          next.buyerId,
          next.sellerId,
          locationMessage,
          'chat.location.stopped',
        );
      }
    } else {
      await stopLiveLocationShareForCompletingUser(
        this.chats,
        this.publisher,
        next,
        userId,
      );
    }
    return next;
  }
}
