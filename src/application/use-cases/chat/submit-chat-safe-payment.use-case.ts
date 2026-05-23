import {
  BadRequestException,
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
import { assertPaymentAmountMatchesExpected } from './_safe-payment.helper.js';

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
    const room = await requireRoomParticipant(
      this.chats,
      this.users,
      chatRoomId,
      userId,
    );
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

    const status = await this.chats.findSafePaymentStatusByChatRoom(room.id);
    if (!status?.canSubmitPayment) {
      throw new BadRequestException(
        'Admin must send KBZPay receiving instructions before you can submit payment',
      );
    }

    assertPaymentAmountMatchesExpected(
      status.transaction.amount,
      dto.paymentAmount,
    );

    await this.chats.submitSafePayment({
      transactionId: status.transaction.id,
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
        transactionId: status.transaction.id,
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
    await Promise.all([
      ...adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN',
          title: 'Safe payment needs review',
          message: `Buyer submitted KBZ transaction ID for chat room ${room.id}.\n\nTransaction: ${dto.kbzTransactionId}\nAmount: ${dto.paymentAmount} MMK`,
          referenceId: status.transaction.id,
          metadata: {
            transactionId: status.transaction.id,
            chatRoomId: room.id,
            buyerId: room.buyerId,
            sellerId: room.sellerId,
            kbzTransactionId: dto.kbzTransactionId,
            paymentAmount: dto.paymentAmount,
          },
        }),
      ),
      this.users.createNotification({
        userId: room.buyerId,
        eventKey: 'CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT',
        title: 'Safe payment submitted',
        message:
          'Your KBZ transaction ID has been submitted. Admin will verify the transfer and update the chat when payment is received.',
        referenceId: status.transaction.id,
        metadata: {
          transactionId: status.transaction.id,
          chatRoomId: room.id,
          kbzTransactionId: dto.kbzTransactionId,
          paymentAmount: dto.paymentAmount,
        },
      }),
    ]);

    return (await this.chats.findTransactionById(status.transaction.id))!;
  }
}
