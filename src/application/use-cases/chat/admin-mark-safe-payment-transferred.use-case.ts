import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
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
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import type { AdminMarkSafePaymentTransferredDto } from '../../dtos/chat/chat.dto.js';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { requireAdmin } from './_helpers.js';

@Injectable()
export class AdminMarkSafePaymentTransferredUseCase {
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
    dto: AdminMarkSafePaymentTransferredDto,
  ): Promise<TransactionData> {
    await requireAdmin(this.users, adminId);
    const transaction = await this.chats.findTransactionById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Both buyer and seller must complete before transfer release',
      );
    }
    const next = await this.chats.markSafePaymentTransferred(
      transactionId,
      adminId,
      dto.transferRef,
      dto.adminNote,
    );
    this.realtime.emitToChatRoom(
      next.chatRoomId,
      'chat.safePayment.transferred',
      {
        transactionId: next.id,
        chatRoomId: next.chatRoomId,
        transferRef: dto.transferRef,
      },
    );
    return next;
  }
}
