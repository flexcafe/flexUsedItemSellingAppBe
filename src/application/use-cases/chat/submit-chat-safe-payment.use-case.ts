import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import type { SubmitSafePaymentDto } from '../../dtos/chat/chat.dto.js';
import {
  CHAT_IDEMPOTENCY_STORE,
  type IChatIdempotencyStore,
} from '../../../domain/services/chat-idempotency.interface.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class SubmitChatSafePaymentUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_IDEMPOTENCY_STORE)
    private readonly idempotency: IChatIdempotencyStore,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    dto: SubmitSafePaymentDto,
  ): Promise<TransactionData> {
    const room = await requireRoomParticipant(this.chats, chatRoomId, userId);
    if (room.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can submit safe payment');
    }
    if (dto.idempotencyKey) {
      const allowed = await this.idempotency.reserve(
        `chat:safe-payment:${room.id}:${userId}:${dto.idempotencyKey}`,
        600,
      );
      if (!allowed) {
        throw new ConflictException('Duplicate safe payment request');
      }
    }
    const transaction = await this.chats.getOrCreateTransaction(
      room.id,
      room.listingId,
      room.buyerId,
      room.sellerId,
      TransactionType.SAFE_PAYMENT,
      dto.paymentAmount,
    );
    await this.chats.submitSafePayment({
      transactionId: transaction.id,
      payerKbzName: dto.payerKbzName,
      payerKbzPhone: dto.payerKbzPhone,
      paymentAmount: dto.paymentAmount,
      kbzTransactionId: dto.kbzTransactionId,
    });
    const message = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.SAFE_PAYMENT_INITIATED,
      content: 'Buyer submitted safe payment. Admin verification pending.',
      metadata: {
        transactionId: transaction.id,
        payerKbzName: dto.payerKbzName,
        payerKbzPhone: dto.payerKbzPhone,
        paymentAmount: dto.paymentAmount,
        kbzTransactionId: dto.kbzTransactionId,
      },
    });
    this.publisher.publish(
      room.id,
      room.buyerId,
      room.sellerId,
      message,
      'chat.safePayment.submitted',
    );
    const adminIds = await this.users.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN',
          title: 'Safe payment needs review',
          message: `Safe payment submitted for chat room ${room.id}.`,
          referenceId: transaction.id,
          metadata: {
            transactionId: transaction.id,
            chatRoomId: room.id,
            buyerId: room.buyerId,
            sellerId: room.sellerId,
          },
        }),
      ),
    );
    return (await this.chats.findTransactionById(transaction.id))!;
  }
}
