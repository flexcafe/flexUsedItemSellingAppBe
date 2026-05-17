import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type ChatMessageData,
  type IChatRepository,
  type TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import type {
  AdminMarkSafePaymentReceivedDto,
  AdminMarkSafePaymentTransferredDto,
  OpenChatRoomDto,
  StartDirectTradeDto,
  SubmitSafePaymentDto,
} from '../../dtos/chat/chat.dto.js';
import { PusherService } from '../../../infrastructure/realtime/pusher.service.js';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { ChatIdempotencyService } from '../../../infrastructure/realtime/chat-idempotency.service.js';
import { CreateTransactionReviewUseCase } from '../points/create-transaction-review.use-case.js';
import type { CreateReviewDto } from '../../dtos/points/review.dto.js';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: IProductRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly pusher: PusherService,
    private readonly realtime: ChatRealtimeService,
    private readonly idempotency: ChatIdempotencyService,
    private readonly createTransactionReviewUseCase: CreateTransactionReviewUseCase,
  ) {}

  async openRoom(userId: string, dto: OpenChatRoomDto) {
    const listing = await this.products.findById(dto.listingId);
    if (!listing || listing.isDeleted) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.sellerId !== dto.sellerId) {
      throw new BadRequestException('Seller does not own this listing');
    }
    if (listing.sellerId === userId) {
      throw new BadRequestException('Seller cannot open chat as buyer');
    }

    const buyer = await this.users.findById(userId);
    const seller = await this.users.findById(dto.sellerId);
    if (!buyer || !seller) {
      throw new NotFoundException('User not found');
    }

    return this.chats.getOrCreateRoom({
      listingId: dto.listingId,
      buyerId: userId,
      sellerId: dto.sellerId,
    });
  }

  async listRooms(userId: string, cursor: string | null, take: number) {
    return this.chats.listRoomsForUser(userId, cursor, take);
  }

  async listMessages(
    userId: string,
    chatRoomId: string,
    cursor: string | null,
    take: number,
  ) {
    const room = await this.requireRoomParticipant(chatRoomId, userId);
    const page = await this.chats.listMessagesByRoom(room.id, cursor, take);
    return page;
  }

  async sendMessage(
    userId: string,
    chatRoomId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    idempotencyKey?: string,
  ): Promise<ChatMessageData> {
    const room = await this.requireRoomParticipant(chatRoomId, userId);
    if (idempotencyKey) {
      const allowed = await this.idempotency.reserve(
        `chat:message:${room.id}:${userId}:${idempotencyKey}`,
        180,
      );
      if (!allowed) {
        throw new ConflictException('Duplicate message request');
      }
    }

    const message = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      content,
      type,
    });
    await this.publishMessage(room.id, room.buyerId, room.sellerId, message);
    return message;
  }

  async markRead(userId: string, chatRoomId: string): Promise<number> {
    await this.requireRoomParticipant(chatRoomId, userId);
    return this.chats.markRoomMessagesRead(chatRoomId, userId);
  }

  async startDirectTrade(
    userId: string,
    chatRoomId: string,
    dto: StartDirectTradeDto,
  ): Promise<TransactionData> {
    const room = await this.requireRoomParticipant(chatRoomId, userId);
    const transaction = await this.chats.getOrCreateTransaction(
      room.id,
      room.listingId,
      room.buyerId,
      room.sellerId,
      TransactionType.DIRECT_TRADE,
      0,
    );
    await this.chats.upsertDirectTrade({
      transactionId: transaction.id,
      meetingDate: new Date(dto.meetingDate),
      meetingTime: dto.meetingTime,
      meetingLocation: dto.meetingLocation,
      meetingLatitude: dto.meetingLatitude,
      meetingLongitude: dto.meetingLongitude,
    });
    const systemMessage = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.DIRECT_TRADE_REQUEST,
      content: 'Direct trade requested with meeting details.',
      metadata: {
        transactionId: transaction.id,
        meetingDate: dto.meetingDate,
        meetingTime: dto.meetingTime,
        meetingLocation: dto.meetingLocation ?? null,
        meetingLatitude: dto.meetingLatitude ?? null,
        meetingLongitude: dto.meetingLongitude ?? null,
      },
    });
    await this.publishMessage(
      room.id,
      room.buyerId,
      room.sellerId,
      systemMessage,
      'chat.directTrade.requested',
    );
    return transaction;
  }

  async updateLocationShare(
    userId: string,
    chatRoomId: string,
    latitude: number,
    longitude: number,
    expiresInSeconds: number,
  ): Promise<void> {
    const room = await this.requireRoomParticipant(chatRoomId, userId);
    const transaction = await this.chats.findTransactionForChat(
      room.id,
      TransactionType.DIRECT_TRADE,
    );
    if (!transaction) {
      throw new NotFoundException('Direct trade transaction not found');
    }
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await this.chats.upsertLocationShare({
      directTradeId: transaction.id,
      userId,
      latitude,
      longitude,
      expiresAt,
    });
    this.realtime.emitToChatRoom(room.id, 'chat.location.updated', {
      chatRoomId: room.id,
      userId,
      latitude,
      longitude,
      expiresAt: expiresAt.toISOString(),
    });
  }

  async stopLocationShare(userId: string, chatRoomId: string): Promise<void> {
    const room = await this.requireRoomParticipant(chatRoomId, userId);
    const transaction = await this.chats.findTransactionForChat(
      room.id,
      TransactionType.DIRECT_TRADE,
    );
    if (!transaction) {
      throw new NotFoundException('Direct trade transaction not found');
    }
    await this.chats.stopLocationShare(transaction.id, userId);
    const systemMessage = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.LOCATION_SHARING_STOPPED,
      content: 'Location sharing stopped.',
      metadata: { transactionId: transaction.id },
    });
    await this.publishMessage(
      room.id,
      room.buyerId,
      room.sellerId,
      systemMessage,
      'chat.location.stopped',
    );
  }

  async submitSafePayment(
    userId: string,
    chatRoomId: string,
    dto: SubmitSafePaymentDto,
  ): Promise<TransactionData> {
    const room = await this.requireRoomParticipant(chatRoomId, userId);
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
      content:
        'Buyer submitted safe payment. Admin verification pending.',
      metadata: {
        transactionId: transaction.id,
        payerKbzName: dto.payerKbzName,
        payerKbzPhone: dto.payerKbzPhone,
        paymentAmount: dto.paymentAmount,
        kbzTransactionId: dto.kbzTransactionId,
      },
    });
    await this.publishMessage(
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

  async completeTransaction(
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
    const next = await this.chats.markTransactionCompletedByUser(transactionId, userId);
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
    await this.publishMessage(
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
    return next;
  }

  async adminMarkSafePaymentReceived(
    adminId: string,
    transactionId: string,
    dto: AdminMarkSafePaymentReceivedDto,
  ): Promise<TransactionData> {
    await this.requireAdmin(adminId);
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

  async adminMarkSafePaymentTransferred(
    adminId: string,
    transactionId: string,
    dto: AdminMarkSafePaymentTransferredDto,
  ): Promise<TransactionData> {
    await this.requireAdmin(adminId);
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
    this.realtime.emitToChatRoom(next.chatRoomId, 'chat.safePayment.transferred', {
      transactionId: next.id,
      chatRoomId: next.chatRoomId,
      transferRef: dto.transferRef,
    });
    return next;
  }

  async listPendingSafePayments(cursor: string | null, take: number) {
    return this.chats.listPendingSafePayments(cursor, take);
  }

  async submitReviewAfterCompletion(
    userId: string,
    transactionId: string,
    dto: CreateReviewDto,
  ) {
    const transaction = await this.chats.findTransactionById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Reviews can only be submitted after transaction completion',
      );
    }
    return this.createTransactionReviewUseCase.execute(transactionId, userId, dto);
  }

  private async requireRoomParticipant(chatRoomId: string, userId: string) {
    const room = await this.chats.findRoomById(chatRoomId);
    if (!room) {
      throw new NotFoundException('Chat room not found');
    }
    if (room.buyerId !== userId && room.sellerId !== userId) {
      throw new ForbiddenException('Not part of this chat room');
    }
    return room;
  }

  private async requireAdmin(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Admin not found');
    }
    if (!user.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  private async publishMessage(
    chatRoomId: string,
    buyerId: string,
    sellerId: string,
    message: ChatMessageData,
    event = 'chat.message.sent',
  ): Promise<void> {
    this.realtime.emitToChatRoom(chatRoomId, event, {
      chatRoomId,
      message,
    });
    this.realtime.emitToUser(buyerId, 'chat.room.updated', {
      chatRoomId,
      messageId: message.id,
    });
    this.realtime.emitToUser(sellerId, 'chat.room.updated', {
      chatRoomId,
      messageId: message.id,
    });
    await Promise.all([
      this.pusher.trigger(`private-user-${buyerId}`, 'chat.room.updated', {
        chatRoomId,
        messageId: message.id,
      }),
      this.pusher.trigger(`private-user-${sellerId}`, 'chat.room.updated', {
        chatRoomId,
        messageId: message.id,
      }),
    ]);
  }
}
