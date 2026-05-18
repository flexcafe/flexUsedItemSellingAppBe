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
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class RequestChatSafePaymentUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(userId: string, chatRoomId: string): Promise<TransactionData> {
    const room = await requireRoomParticipant(this.chats, chatRoomId, userId);
    if (room.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can request safe payment');
    }

    let result: { transaction: TransactionData };
    try {
      result = await this.chats.requestSafePayment(
        room.id,
        room.listingId,
        room.buyerId,
        room.sellerId,
      );
    } catch (err) {
      if (err instanceof ConflictException) {
        const status = await this.chats.findSafePaymentStatusByChatRoom(
          room.id,
        );
        if (status) {
          return status.transaction;
        }
      }
      throw err;
    }

    const message = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.SAFE_PAYMENT_REQUESTED,
      content:
        'Buyer requested safe payment. Waiting for admin to send KBZPay receiving number.',
      metadata: { transactionId: result.transaction.id },
    });
    this.publisher.publish(
      room.id,
      room.buyerId,
      room.sellerId,
      message,
      'chat.safePayment.requested',
    );

    const adminIds = await this.users.findAdminUserIds();
    await Promise.all([
      ...adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'CHAT_SAFE_PAYMENT_REQUESTED_ADMIN',
          title: 'Safe payment requested',
          message: `Buyer requested safe payment for chat room ${room.id}. Send KBZPay receiving number.`,
          referenceId: result.transaction.id,
          metadata: {
            transactionId: result.transaction.id,
            chatRoomId: room.id,
            buyerId: room.buyerId,
            sellerId: room.sellerId,
          },
        }),
      ),
      this.users.createNotification({
        userId: room.buyerId,
        eventKey: 'CHAT_SAFE_PAYMENT_REQUESTED_CLIENT',
        title: 'Safe payment requested',
        message:
          'Your safe payment request is pending. An admin will send the KBZPay receiving number by notification. After you receive it, pay in KBZPay and submit your transaction ID in the chat.',
        referenceId: result.transaction.id,
        metadata: {
          transactionId: result.transaction.id,
          chatRoomId: room.id,
        },
      }),
    ]);

    return result.transaction;
  }
}
