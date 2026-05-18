import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import type { AdminMarkSafePaymentReceivedDto } from '../../dtos/chat/chat.dto.js';
import {
  CHAT_REALTIME,
  type IChatRealtime,
} from '../../../domain/services/chat-realtime.interface.js';
import { requireAdmin } from './_helpers.js';

@Injectable()
export class AdminMarkSafePaymentReceivedUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_REALTIME)
    private readonly realtime: IChatRealtime,
  ) {}

  async execute(
    adminId: string,
    transactionId: string,
    dto: AdminMarkSafePaymentReceivedDto,
  ): Promise<TransactionData> {
    await requireAdmin(this.users, adminId);
    const next = await this.chats.markSafePaymentReceived(
      transactionId,
      adminId,
      dto.adminReceivingPhone,
      dto.adminNote,
    );
    this.realtime.emitToChatRoom(next.chatRoomId, 'chat.safePayment.received', {
      transactionId: next.id,
      chatRoomId: next.chatRoomId,
      status: next.status,
    });

    const noteSuffix = dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : '';
    await Promise.all([
      this.users.createNotification({
        userId: next.buyerId,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_CLIENT',
        title: 'Safe payment received',
        message: `Admin confirmed your safe payment. You can continue the trade and mark the transaction complete when finished.${noteSuffix}`,
        referenceId: next.id,
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          role: 'buyer',
          adminNote: dto.adminNote ?? null,
        },
      }),
      this.users.createNotification({
        userId: next.sellerId,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_CLIENT',
        title: 'Buyer payment secured',
        message: `Admin confirmed the buyer's safe payment. Complete the trade in chat when ready; funds will be released after both sides mark complete.${noteSuffix}`,
        referenceId: next.id,
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          role: 'seller',
          adminNote: dto.adminNote ?? null,
        },
      }),
      this.users.createNotification({
        userId: adminId,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_ADMIN',
        title: 'Safe payment marked received',
        message: `You marked safe payment ${next.id} as received for chat room ${next.chatRoomId}.`,
        referenceId: next.id,
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          buyerId: next.buyerId,
          sellerId: next.sellerId,
        },
      }),
    ]);

    return next;
  }
}
