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
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { requireAdmin } from './_helpers.js';

@Injectable()
export class AdminMarkSafePaymentReceivedUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly realtime: ChatRealtimeService,
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
    return next;
  }
}
