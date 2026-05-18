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
import type { AdminSendSafePaymentInstructionDto } from '../../dtos/chat/chat.dto.js';
import {
  CHAT_REALTIME,
  type IChatRealtime,
} from '../../../domain/services/chat-realtime.interface.js';
import { requireAdmin } from './_helpers.js';

@Injectable()
export class AdminSendSafePaymentInstructionUseCase {
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
    dto: AdminSendSafePaymentInstructionDto,
  ): Promise<TransactionData> {
    await requireAdmin(this.users, adminId);
    const { transaction, safePayment } =
      await this.chats.sendSafePaymentInstruction(
        transactionId,
        adminId,
        dto.adminReceivingPhone,
        dto.adminNote,
      );

    this.realtime.emitToChatRoom(
      transaction.chatRoomId,
      'chat.safePayment.instructionSent',
      {
        transactionId,
        chatRoomId: transaction.chatRoomId,
        status: transaction.status,
        adminReceivingPhone: dto.adminReceivingPhone,
        adminNote: dto.adminNote ?? null,
        instructionSentAt: safePayment.instructionSentAt?.toISOString() ?? null,
      },
    );

    await Promise.all([
      this.users.createNotification({
        userId: transaction.buyerId,
        eventKey: 'CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT',
        title: 'KBZPay transfer instruction',
        message: `Please transfer to ${dto.adminReceivingPhone}. After paying in KBZPay, open the chat and submit your transaction ID.${dto.adminNote ? `\n\nNote: ${dto.adminNote}` : ''}`,
        referenceId: transactionId,
        metadata: {
          transactionId,
          chatRoomId: transaction.chatRoomId,
          adminReceivingPhone: dto.adminReceivingPhone,
          adminNote: dto.adminNote ?? null,
        },
      }),
      this.users.createNotification({
        userId: adminId,
        eventKey: 'CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN',
        title: 'Safe payment instruction sent',
        message: `Transfer instruction sent to buyer for transaction ${transactionId}.\n\nReceiving phone: ${dto.adminReceivingPhone}`,
        referenceId: transactionId,
        metadata: {
          transactionId,
          chatRoomId: transaction.chatRoomId,
          buyerId: transaction.buyerId,
          adminReceivingPhone: dto.adminReceivingPhone,
        },
      }),
    ]);

    return transaction;
  }
}
