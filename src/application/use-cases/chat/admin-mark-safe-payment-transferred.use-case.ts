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
import {
  CHAT_REALTIME,
  type IChatRealtime,
} from '../../../domain/services/chat-realtime.interface.js';
import { requireAdmin } from './_helpers.js';

@Injectable()
export class AdminMarkSafePaymentTransferredUseCase {
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

    const noteSuffix = dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : '';
    await Promise.all([
      this.users.createNotification({
        userId: next.sellerId,
        eventKey: 'CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT',
        title: 'Payment released to seller',
        message: `Admin transferred your safe payment proceeds. Reference: ${dto.transferRef}.${noteSuffix}`,
        referenceId: next.id,
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          transferRef: dto.transferRef,
          role: 'seller',
        },
      }),
      this.users.createNotification({
        userId: next.buyerId,
        eventKey: 'CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT',
        title: 'Safe payment released',
        message: `Admin released the safe payment to the seller. Reference: ${dto.transferRef}.${noteSuffix}`,
        referenceId: next.id,
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          transferRef: dto.transferRef,
          role: 'buyer',
        },
      }),
      this.users.createNotification({
        userId: adminId,
        eventKey: 'CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN',
        title: 'Safe payment transferred',
        message: `You marked safe payment ${next.id} as transferred to seller.\n\nReference: ${dto.transferRef}`,
        referenceId: next.id,
        metadata: {
          transactionId: next.id,
          chatRoomId: next.chatRoomId,
          sellerId: next.sellerId,
          transferRef: dto.transferRef,
        },
      }),
    ]);

    return next;
  }
}
