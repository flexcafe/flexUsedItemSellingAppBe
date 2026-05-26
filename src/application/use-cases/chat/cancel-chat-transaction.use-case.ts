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
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  assertTransactionCancellable,
  requireActiveChatUser,
} from './_helpers.js';

const TRANSACTION_CANCELLATION_PENALTY = 20;

@Injectable()
export class CancelChatTransactionUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: IProductRepository,
    @Inject(POINTS_REPOSITORY)
    private readonly points: IPointsRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(userId: string, transactionId: string): Promise<TransactionData> {
    const tx = await this.chats.findTransactionById(transactionId);
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    if (tx.buyerId !== userId && tx.sellerId !== userId) {
      throw new ForbiddenException('Not part of this transaction');
    }
    await requireActiveChatUser(this.users, userId);
    if (tx.status === TransactionStatus.CANCELLED) {
      return tx;
    }
    assertTransactionCancellable(tx);

    const { transaction: next, cancelledNow } =
      await this.chats.markTransactionCancelledByUser(transactionId, userId);
    if (!cancelledNow) {
      return next;
    }

    const penalty = await this.points.deductPointsForTransactionCancellation(
      userId,
      next.id,
      TRANSACTION_CANCELLATION_PENALTY,
    );

    const message = await this.chats.createMessage({
      chatRoomId: next.chatRoomId,
      senderId: userId,
      type: MessageType.SYSTEM,
      content: 'Transaction was cancelled by a participant.',
      metadata: {
        transactionId: next.id,
        status: next.status,
        cancelledByUserId: userId,
        deductedPoints: penalty.deductedPoints,
        balanceAfter: penalty.balanceAfter,
      },
    });
    this.publisher.publish(
      next.chatRoomId,
      next.buyerId,
      next.sellerId,
      message,
      'chat.transaction.cancelled',
    );
    const counterpartyUserId =
      userId === next.buyerId ? next.sellerId : next.buyerId;
    await Promise.all([
      this.users.createNotification({
        userId,
        eventKey: 'CHAT_TRANSACTION_CANCELLED_SELF_PENALTY',
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          deductedPoints: penalty.deductedPoints,
          balanceAfter: penalty.balanceAfter,
        },
        title: 'Transaction cancelled',
        message: `You cancelled this transaction. 20 points were deducted.`,
        referenceId: next.id,
      }),
      this.users.createNotification({
        userId: counterpartyUserId,
        eventKey: 'CHAT_TRANSACTION_CANCELLED_COUNTERPARTY',
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          cancelledByUserId: userId,
        },
        title: 'Transaction cancelled',
        message: 'The other party cancelled this transaction.',
        referenceId: next.id,
      }),
    ]);
    await this.chats.stopAllLocationSharesForChatRoom(next.chatRoomId);
    const activeDealChatRoomId = await this.products.getActiveDealChatRoomId(
      next.listingId,
    );
    if (activeDealChatRoomId === next.chatRoomId) {
      await this.products.setActiveDealChatRoomId(
        next.listingId,
        next.sellerId,
        null,
      );
    }
    return next;
  }
}
