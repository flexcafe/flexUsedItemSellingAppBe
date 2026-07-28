import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import {
  type ChatCursorPage,
  type ChatMessageData,
  type ChatRoomCounterpartySnapshot,
  type ChatRoomData,
  type ChatRoomListingSnapshot,
  type ChatRoomParticipantData,
  type ChatRoomSummaryData,
  type CreateChatMessageData,
  type CreateChatRoomData,
  type DirectTradeData,
  type DirectTradeRecord,
  type IChatRepository,
  type LocationShareData,
  type OpenChatRoomResult,
  type AwaitingSafePaymentInstructionData,
  type PendingSafePaymentData,
  type SafePaymentData,
  type SafePaymentStatusData,
  type SafePaymentSubmissionData,
  type TransactionData,
} from '../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../domain/enums/message-type.enum.js';
import {
  TERMINAL_CHAT_TRANSACTION_STATUSES,
  TransactionStatus,
} from '../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../domain/enums/transaction-type.enum.js';
import type { JsonValue } from '../../domain/repositories/user.repository.interface.js';

const { TransactionStatus: PrismaTransactionStatus } = PrismaPkg;

const TERMINAL_CHAT_TRANSACTION_PRISMA_STATUSES =
  TERMINAL_CHAT_TRANSACTION_STATUSES.map(
    (s) => s as PrismaPkg.TransactionStatus,
  );

type CursorToken = {
  createdAt: Date;
  id: string;
};

@Injectable()
export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateRoom(
    data: CreateChatRoomData,
    viewerUserId: string,
  ): Promise<OpenChatRoomResult> {
    const opened = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.chatRoom.findUnique({
        where: {
          listingId_buyerId_sellerId: {
            listingId: data.listingId,
            buyerId: data.buyerId,
            sellerId: data.sellerId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return {
          roomId: existing.id,
          wasCreated: false,
          shouldNotifySellerUnacceptedInterestThreshold: false,
          interestedBuyerCount: null as number | null,
        };
      }

      const row = await tx.chatRoom.create({
        data: {
          listingId: data.listingId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
        },
        select: { id: true },
      });

      const listing = await tx.listing.findUnique({
        where: { id: data.listingId },
        select: {
          interestedBuyerCount: true,
          lastInterestReminderCount: true,
          activeDealChatRoomId: true,
        },
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      const nextInterestedBuyerCount = listing.interestedBuyerCount + 1;
      let shouldNotify = false;
      let nextReminderCount = listing.lastInterestReminderCount;
      if (!listing.activeDealChatRoomId) {
        const delta = nextInterestedBuyerCount - listing.lastInterestReminderCount;
        if (delta >= 5) {
          shouldNotify = true;
          nextReminderCount = nextInterestedBuyerCount;
        }
      }

      await tx.listing.update({
        where: { id: data.listingId },
        data: {
          interestedBuyerCount: nextInterestedBuyerCount,
          lastInterestReminderCount: nextReminderCount,
        },
      });

      return {
        roomId: row.id,
        wasCreated: true,
        shouldNotifySellerUnacceptedInterestThreshold: shouldNotify,
        interestedBuyerCount: shouldNotify ? nextInterestedBuyerCount : null,
      };
    });

    const room = await this.loadRoomById(opened.roomId, viewerUserId);
    return {
      room,
      wasCreated: opened.wasCreated,
      shouldNotifySellerUnacceptedInterestThreshold:
        opened.shouldNotifySellerUnacceptedInterestThreshold,
      interestedBuyerCount: opened.interestedBuyerCount,
    };
  }

  async findRoomById(
    chatRoomId: string,
  ): Promise<ChatRoomParticipantData | null> {
    const row = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      select: {
        id: true,
        listingId: true,
        buyerId: true,
        sellerId: true,
      },
    });
    return row ? this.mapRoomParticipant(row) : null;
  }

  async listRoomsForUser(
    userId: string,
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<ChatRoomSummaryData>> {
    const pageSize = this.normalizeTake(take, 50);
    const decoded = this.decodeCursor(cursor);
    const userScopeWhere: PrismaPkg.Prisma.ChatRoomWhereInput = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };
    const cursorWhere: PrismaPkg.Prisma.ChatRoomWhereInput | undefined = decoded
      ? {
          OR: [
            { updatedAt: { lt: decoded.createdAt } },
            {
              updatedAt: decoded.createdAt,
              id: { lt: decoded.id },
            },
          ],
        }
      : undefined;
    const rows = await this.prisma.chatRoom.findMany({
      where: cursorWhere
        ? {
            AND: [userScopeWhere, cursorWhere],
          }
        : userScopeWhere,
      select: this.roomListSelect(),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });

    const hasNext = rows.length > pageSize;
    const slice = hasNext ? rows.slice(0, pageSize) : rows;

    const items = slice.map((row) => this.mapRoomSummary(row, userId));

    const last = slice.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last ? this.encodeCursor(last.updatedAt, last.id) : null,
    };
  }

  async listMessagesByRoom(
    chatRoomId: string,
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<ChatMessageData>> {
    const pageSize = this.normalizeTake(take, 100);
    const decoded = this.decodeCursor(cursor);
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        chatRoomId,
        isHidden: false,
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.createdAt } },
                { createdAt: decoded.createdAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });
    const hasNext = rows.length > pageSize;
    const slice = hasNext ? rows.slice(0, pageSize) : rows;
    const last = slice.at(-1);

    return {
      items: slice.map((r) => this.mapMessage(r)),
      nextCursor:
        hasNext && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async createMessage(data: CreateChatMessageData): Promise<ChatMessageData> {
    const row = await this.prisma.$transaction(async (tx) => {
      return this.createMessageWithRoomSnapshot(tx, data);
    });
    return this.mapMessage(row);
  }

  async markRoomMessagesRead(
    chatRoomId: string,
    userId: string,
  ): Promise<number> {
    const result = await this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.findUnique({
        where: { id: chatRoomId },
        select: { buyerId: true, sellerId: true },
      });
      if (!room) {
        throw new NotFoundException('Chat room not found');
      }

      const updated = await tx.chatMessage.updateMany({
        where: {
          chatRoomId,
          senderId: { not: userId },
          isRead: false,
        },
        data: { isRead: true },
      });

      const unreadRemaining = await tx.chatMessage.count({
        where: {
          chatRoomId,
          senderId: { not: userId },
          isRead: false,
        },
      });

      await tx.chatRoom.update({
        where: { id: chatRoomId },
        data:
          room.buyerId === userId
            ? { unreadCountBuyer: unreadRemaining }
            : { unreadCountSeller: unreadRemaining },
      });

      return updated;
    });
    return result.count;
  }

  async getOrCreateTransaction(
    chatRoomId: string,
    listingId: string,
    buyerId: string,
    sellerId: string,
    type: TransactionType,
    amount = 0,
  ): Promise<TransactionData> {
    const existing = await this.prisma.transaction.findFirst({
      where: {
        chatRoomId,
        type: type as unknown as PrismaPkg.TransactionType,
        status: {
          notIn: [
            PrismaTransactionStatus.CANCELLED,
            PrismaTransactionStatus.REFUNDED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return this.mapTransaction(existing);
    }

    const row = await this.prisma.transaction.create({
      data: {
        chatRoomId,
        listingId,
        buyerId,
        sellerId,
        type: type as unknown as PrismaPkg.TransactionType,
        status: PrismaTransactionStatus.INITIATED,
        amount,
      },
    });
    return this.mapTransaction(row);
  }

  async findTransactionById(
    transactionId: string,
  ): Promise<TransactionData | null> {
    const row = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    return row ? this.mapTransaction(row) : null;
  }

  async findTransactionForChat(
    chatRoomId: string,
    type: TransactionType,
  ): Promise<TransactionData | null> {
    const row = await this.prisma.transaction.findFirst({
      where: {
        chatRoomId,
        type: type as unknown as PrismaPkg.TransactionType,
        status: { notIn: TERMINAL_CHAT_TRANSACTION_PRISMA_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapTransaction(row) : null;
  }

  async findBlockingSafePaymentForChat(
    chatRoomId: string,
  ): Promise<TransactionData | null> {
    const row = await this.prisma.transaction.findFirst({
      where: {
        chatRoomId,
        type: PrismaPkg.TransactionType.SAFE_PAYMENT,
        status: {
          notIn: [
            PrismaTransactionStatus.CANCELLED,
            PrismaTransactionStatus.REFUNDED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapTransaction(row) : null;
  }

  async findDirectTradeIdByTransactionId(
    transactionId: string,
  ): Promise<string | null> {
    const row = await this.prisma.directTrade.findUnique({
      where: { transactionId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findDirectTradeByTransactionId(
    transactionId: string,
  ): Promise<DirectTradeRecord | null> {
    const row = await this.prisma.directTrade.findUnique({
      where: { transactionId },
    });
    if (!row) return null;
    return {
      id: row.id,
      transactionId: row.transactionId,
      meetingDate: row.meetingDate,
      meetingTime: row.meetingTime,
      meetingLocation: row.meetingLocation,
      meetingLatitude: row.meetingLatitude,
      meetingLongitude: row.meetingLongitude,
      acceptedLocationLabel: row.acceptedLocationLabel,
      buyerRequestedLocation: row.buyerRequestedLocation,
      buyerRequestedLatitude: row.buyerRequestedLatitude,
      buyerRequestedLongitude: row.buyerRequestedLongitude,
    };
  }

  async hasOpenDirectTradeForListing(listingId: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({
      where: {
        listingId,
        type: PrismaPkg.TransactionType.DIRECT_TRADE,
        status: { notIn: TERMINAL_CHAT_TRANSACTION_PRISMA_STATUSES },
      },
    });
    return count > 0;
  }

  async upsertDirectTrade(data: DirectTradeData): Promise<void> {
    await this.prisma.directTrade.upsert({
      where: { transactionId: data.transactionId },
      update: {
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
        meetingLocation: data.meetingLocation ?? null,
        meetingLatitude: data.meetingLatitude ?? null,
        meetingLongitude: data.meetingLongitude ?? null,
        acceptedLocationLabel: data.acceptedLocationLabel ?? null,
        buyerRequestedLocation: data.buyerRequestedLocation ?? null,
        buyerRequestedLatitude: data.buyerRequestedLatitude ?? null,
        buyerRequestedLongitude: data.buyerRequestedLongitude ?? null,
      },
      create: {
        transactionId: data.transactionId,
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
        meetingLocation: data.meetingLocation ?? null,
        meetingLatitude: data.meetingLatitude ?? null,
        meetingLongitude: data.meetingLongitude ?? null,
        acceptedLocationLabel: data.acceptedLocationLabel ?? null,
        buyerRequestedLocation: data.buyerRequestedLocation ?? null,
        buyerRequestedLatitude: data.buyerRequestedLatitude ?? null,
        buyerRequestedLongitude: data.buyerRequestedLongitude ?? null,
      },
    });
  }

  async startLocationShare(
    data: LocationShareData,
  ): Promise<{ alreadyActive: boolean }> {
    const active = await this.prisma.locationShare.findFirst({
      where: {
        directTradeId: data.directTradeId,
        userId: data.userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (active) {
      await this.prisma.locationShare.update({
        where: { id: active.id },
        data: {
          latitude: data.latitude,
          longitude: data.longitude,
          expiresAt: data.expiresAt,
          isActive: true,
        },
      });
      return { alreadyActive: true };
    }

    await this.prisma.locationShare.create({
      data: {
        directTradeId: data.directTradeId,
        userId: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });
    return { alreadyActive: false };
  }

  async updateLocationShare(data: LocationShareData): Promise<void> {
    const active = await this.prisma.locationShare.findFirst({
      where: {
        directTradeId: data.directTradeId,
        userId: data.userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!active) {
      throw new BadRequestException(
        'Start location sharing before sending location updates',
      );
    }
    await this.prisma.locationShare.update({
      where: { id: active.id },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });
  }

  async stopLocationShare(
    directTradeId: string,
    userId: string,
  ): Promise<number> {
    const result = await this.prisma.locationShare.updateMany({
      where: { directTradeId, userId, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }

  async stopAllLocationSharesForChatRoom(chatRoomId: string): Promise<number> {
    const directTrade = await this.prisma.directTrade.findFirst({
      where: {
        transaction: {
          chatRoomId,
          type: PrismaPkg.TransactionType.DIRECT_TRADE,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!directTrade) {
      return 0;
    }
    const result = await this.prisma.locationShare.updateMany({
      where: { directTradeId: directTrade.id, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }

  async requestSafePayment(
    chatRoomId: string,
    listingId: string,
    buyerId: string,
    sellerId: string,
    listingPrice: number,
  ): Promise<{ transaction: TransactionData; safePayment: SafePaymentData }> {
    const expectedAmount = Math.round(listingPrice);
    const active = await this.findActiveSafePaymentTransaction(chatRoomId);
    const blockedAfterSubmit = new Set<string>([
      PrismaTransactionStatus.SAFE_PAYMENT_PENDING,
      PrismaTransactionStatus.SAFE_PAYMENT_RECEIVED,
      PrismaTransactionStatus.BUYER_COMPLETED,
      PrismaTransactionStatus.SELLER_COMPLETED,
      PrismaTransactionStatus.COMPLETED,
    ]);
    if (active && blockedAfterSubmit.has(active.status)) {
      throw new ConflictException(
        'Safe payment is already in progress for this chat',
      );
    }

    let transaction = active;
    if (!transaction) {
      const created = await this.prisma.transaction.create({
        data: {
          chatRoomId,
          listingId,
          buyerId,
          sellerId,
          type: PrismaPkg.TransactionType.SAFE_PAYMENT,
          status: PrismaTransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
          amount: expectedAmount,
        },
      });
      transaction = created;
    } else {
      const updated = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: PrismaTransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
          amount: expectedAmount,
        },
      });
      transaction = updated;
    }

    const safePayment = await this.prisma.safePayment.upsert({
      where: { transactionId: transaction.id },
      update: {},
      create: { transactionId: transaction.id },
    });

    return {
      transaction: this.mapTransaction(transaction),
      safePayment: this.mapSafePayment(safePayment),
    };
  }

  async sendSafePaymentInstruction(
    transactionId: string,
    adminId: string,
    adminReceivingPhone: string,
    adminNote?: string,
  ): Promise<{ transaction: TransactionData; safePayment: SafePaymentData }> {
    const row = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (
        transaction.status !==
        PrismaTransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION
      ) {
        throw new BadRequestException(
          'Safe payment is not awaiting admin transfer instruction',
        );
      }

      const safePayment = await tx.safePayment.upsert({
        where: { transactionId },
        update: {
          adminReceivingPhone,
          instructionSentAt: new Date(),
          instructionSentById: adminId,
          instructionNote: adminNote ?? null,
        },
        create: {
          transactionId,
          adminReceivingPhone,
          instructionSentAt: new Date(),
          instructionSentById: adminId,
          instructionNote: adminNote ?? null,
        },
      });

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: PrismaTransactionStatus.SAFE_PAYMENT_INSTRUCTION_SENT,
        },
      });

      await this.createMessageWithRoomSnapshot(tx, {
        chatRoomId: updatedTx.chatRoomId,
        senderId: adminId,
        type: MessageType.SAFE_PAYMENT_INSTRUCTION_SENT,
        content:
          'Admin sent KBZPay transfer instruction. Buyer can pay and submit transaction ID.',
        metadata: {
          transactionId,
          adminReceivingPhone,
          adminNote: adminNote ?? null,
          instructionSentAt:
            safePayment.instructionSentAt?.toISOString() ?? null,
        },
      });

      return { transaction: updatedTx, safePayment };
    });

    return {
      transaction: this.mapTransaction(row.transaction),
      safePayment: this.mapSafePayment(row.safePayment),
    };
  }

  async findSafePaymentStatusByChatRoom(
    chatRoomId: string,
  ): Promise<SafePaymentStatusData | null> {
    const transaction = await this.findActiveSafePaymentTransaction(chatRoomId);
    if (!transaction) {
      return null;
    }
    const safePayment = await this.prisma.safePayment.findUnique({
      where: { transactionId: transaction.id },
    });
    if (!safePayment) {
      return null;
    }
    const mappedPayment = this.mapSafePayment(safePayment);
    const mappedTx = this.mapTransaction(transaction);
    return {
      transaction: mappedTx,
      safePayment: mappedPayment,
      canSubmitPayment:
        mappedTx.status === TransactionStatus.SAFE_PAYMENT_INSTRUCTION_SENT &&
        mappedPayment.instructionSentAt != null,
      buyerKbzAccount: null,
    };
  }

  async submitSafePayment(
    data: SafePaymentSubmissionData,
  ): Promise<SafePaymentData> {
    const existing = await this.prisma.transaction.findUnique({
      where: { id: data.transactionId },
      include: { safePayment: true },
    });
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }
    if (
      existing.status !== PrismaTransactionStatus.SAFE_PAYMENT_INSTRUCTION_SENT
    ) {
      throw new BadRequestException(
        'Admin must send KBZPay receiving instructions before buyer can submit payment',
      );
    }
    if (!existing.safePayment?.instructionSentAt) {
      throw new BadRequestException(
        'Transfer instruction has not been sent yet',
      );
    }

    const expectedAmount = Math.round(Number(existing.amount));
    const submittedAmount = Math.round(data.paymentAmount);
    if (submittedAmount !== expectedAmount) {
      throw new BadRequestException(
        `Payment amount must be exactly ${expectedAmount} MMK (listing price)`,
      );
    }

    await this.prisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        status: PrismaTransactionStatus.SAFE_PAYMENT_PENDING,
        amount: submittedAmount,
      },
    });
    const row = await this.prisma.safePayment.update({
      where: { transactionId: data.transactionId },
      data: {
        payerKbzName: data.payerKbzName,
        payerKbzPhone: data.payerKbzPhone,
        paymentAmount: data.paymentAmount,
        kbzTransactionId: data.kbzTransactionId,
      },
    });
    return this.mapSafePayment(row);
  }

  async markSafePaymentReceived(
    transactionId: string,
    adminId: string,
    adminReceivingPhone?: string,
    adminNote?: string,
  ): Promise<TransactionData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const safePayment = await tx.safePayment.findUnique({
        where: { transactionId },
      });
      if (!safePayment) {
        throw new NotFoundException('Safe payment info not found');
      }
      const receivingPhone =
        adminReceivingPhone ?? safePayment.adminReceivingPhone;
      if (!receivingPhone) {
        throw new BadRequestException(
          'Admin receiving phone is required to confirm payment',
        );
      }

      await tx.safePayment.update({
        where: { transactionId },
        data: {
          isVerified: true,
          verifiedById: adminId,
          verifiedAt: new Date(),
          adminReceivingPhone: receivingPhone,
        },
      });

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: PrismaTransactionStatus.SAFE_PAYMENT_RECEIVED,
        },
      });

      await this.createMessageWithRoomSnapshot(tx, {
        chatRoomId: transaction.chatRoomId,
        senderId: adminId,
        type: MessageType.SAFE_PAYMENT_VERIFIED,
        content:
          'Safe payment verified by admin. Money is held until both sides complete.',
        metadata: {
          adminReceivingPhone: receivingPhone,
          adminNote: adminNote ?? null,
          verifiedAt: new Date().toISOString(),
        },
      });

      return transaction;
    });
    return this.mapTransaction(row);
  }

  async markSafePaymentTransferred(
    transactionId: string,
    adminId: string,
    transferRef: string,
    adminNote?: string,
  ): Promise<TransactionData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const safePayment = await tx.safePayment.findUnique({
        where: { transactionId },
      });
      if (!safePayment) {
        throw new NotFoundException('Safe payment info not found');
      }
      if (!safePayment.isVerified) {
        throw new BadRequestException(
          'Cannot transfer before payment verification',
        );
      }

      await tx.safePayment.update({
        where: { transactionId },
        data: {
          isTransferred: true,
          transferredAt: new Date(),
          transferRef,
        },
      });

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: PrismaTransactionStatus.COMPLETED },
      });

      await this.createMessageWithRoomSnapshot(tx, {
        chatRoomId: transaction.chatRoomId,
        senderId: adminId,
        type: MessageType.PAYMENT_TRANSFERRED,
        content: 'Admin transferred safe payment to seller.',
        metadata: {
          transferRef,
          adminNote: adminNote ?? null,
          transferredAt: new Date().toISOString(),
        },
      });

      return transaction;
    });
    return this.mapTransaction(row);
  }

  async markTransactionCompletedByUser(
    transactionId: string,
    userId: string,
  ): Promise<TransactionData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
        throw new ConflictException('User is not part of this transaction');
      }

      const now = new Date();
      const updates: PrismaPkg.Prisma.TransactionUpdateInput = {};
      if (transaction.buyerId === userId && !transaction.buyerCompleted) {
        updates.buyerCompleted = true;
        updates.buyerCompletedAt = now;
        updates.status = PrismaTransactionStatus.BUYER_COMPLETED;
      }
      if (transaction.sellerId === userId && !transaction.sellerCompleted) {
        updates.sellerCompleted = true;
        updates.sellerCompletedAt = now;
        updates.status = PrismaTransactionStatus.SELLER_COMPLETED;
      }

      const nextBuyerCompleted =
        (updates.buyerCompleted as boolean | undefined) ??
        transaction.buyerCompleted;
      const nextSellerCompleted =
        (updates.sellerCompleted as boolean | undefined) ??
        transaction.sellerCompleted;
      if (nextBuyerCompleted && nextSellerCompleted) {
        updates.status = PrismaTransactionStatus.COMPLETED;
        updates.completedAt = now;
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data: updates,
      });
    });

    return this.mapTransaction(row);
  }

  async markTransactionCancelledByUser(
    transactionId: string,
    userId: string,
  ): Promise<{ transaction: TransactionData; cancelledNow: boolean }> {
    const row = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
        throw new ConflictException('User is not part of this transaction');
      }
      if (transaction.status === PrismaTransactionStatus.COMPLETED) {
        throw new BadRequestException('Completed transaction cannot be cancelled');
      }
      if (transaction.status === PrismaTransactionStatus.REFUNDED) {
        throw new BadRequestException('Refunded transaction cannot be cancelled');
      }
      if (transaction.status === PrismaTransactionStatus.CANCELLED) {
        return { transaction, cancelledNow: false };
      }

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: PrismaTransactionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: 'Cancelled by participant',
        },
      });
      return { transaction: updated, cancelledNow: true };
    });
    return { transaction: this.mapTransaction(row.transaction), cancelledNow: row.cancelledNow };
  }

  async listPendingSafePayments(
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<PendingSafePaymentData>> {
    const pageSize = this.normalizeTake(take, 50);
    const decoded = this.decodeCursor(cursor);
    const rows = await this.prisma.transaction.findMany({
      where: {
        status: PrismaTransactionStatus.SAFE_PAYMENT_PENDING,
        safePayment: { is: { isVerified: false } },
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.createdAt } },
                { createdAt: decoded.createdAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      include: { safePayment: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });
    const hasNext = rows.length > pageSize;
    const slice = hasNext ? rows.slice(0, pageSize) : rows;
    const items = slice
      .filter((r) => r.safePayment)
      .map((r) => ({
        transactionId: r.id,
        chatRoomId: r.chatRoomId,
        listingId: r.listingId,
        buyerId: r.buyerId,
        sellerId: r.sellerId,
        amount: Number(r.amount),
        payerKbzName: r.safePayment!.payerKbzName ?? '',
        payerKbzPhone: r.safePayment!.payerKbzPhone ?? '',
        kbzTransactionId: r.safePayment!.kbzTransactionId ?? '',
        createdAt: r.createdAt,
      }));
    const last = slice.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async listAwaitingSafePaymentInstructions(
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<AwaitingSafePaymentInstructionData>> {
    const pageSize = this.normalizeTake(take, 50);
    const decoded = this.decodeCursor(cursor);
    const rows = await this.prisma.transaction.findMany({
      where: {
        status: PrismaTransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.createdAt } },
                { createdAt: decoded.createdAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      include: {
        buyer: {
          select: {
            nickname: true,
          },
        },
        seller: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });
    const hasNext = rows.length > pageSize;
    const slice = hasNext ? rows.slice(0, pageSize) : rows;
    const items: AwaitingSafePaymentInstructionData[] = slice.map((r) => ({
      transactionId: r.id,
      chatRoomId: r.chatRoomId,
      listingId: r.listingId,
      buyerId: r.buyerId,
      buyerName: r.buyer.nickname,
      sellerId: r.sellerId,
      sellerName: r.seller.nickname,
      createdAt: r.createdAt,
    }));
    const last = slice.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  private async findActiveSafePaymentTransaction(chatRoomId: string) {
    return this.prisma.transaction.findFirst({
      where: {
        chatRoomId,
        type: PrismaPkg.TransactionType.SAFE_PAYMENT,
        status: {
          notIn: [
            PrismaTransactionStatus.CANCELLED,
            PrismaTransactionStatus.REFUNDED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async loadRoomById(
    chatRoomId: string,
    viewerUserId: string,
  ): Promise<ChatRoomData> {
    const row = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      select: this.roomDetailSelect(),
    });
    if (!row) {
      throw new NotFoundException('Chat room not found');
    }
    return this.mapRoomDetail(row, viewerUserId);
  }

  private roomListSelect() {
    return {
      id: true,
      listingId: true,
      buyerId: true,
      sellerId: true,
      lastMessageId: true,
      lastMessagePreview: true,
      lastMessageType: true,
      lastMessageAt: true,
      unreadCountBuyer: true,
      unreadCountSeller: true,
      updatedAt: true,
      listing: this.listingRelationSelect(),
      buyer: this.userRelationSelect(),
      seller: this.userRelationSelect(),
    };
  }

  private roomDetailSelect() {
    return {
      id: true,
      listingId: true,
      buyerId: true,
      sellerId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      listing: this.listingRelationSelect(),
      buyer: this.userRelationSelect(),
      seller: this.userRelationSelect(),
    };
  }

  private listingRelationSelect() {
    return {
      select: {
        id: true,
        title: true,
        price: true,
        images: {
          orderBy: { sortOrder: 'asc' as const },
          take: 1,
          select: { url: true },
        },
      },
    };
  }

  private userRelationSelect() {
    return {
      select: {
        id: true,
        nickname: true,
        profile: { select: { avatar: true } },
      },
    };
  }

  private mapRoomParticipant(row: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
  }): ChatRoomParticipantData {
    return {
      id: row.id,
      listingId: row.listingId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
    };
  }

  private mapListingSnapshot(listing: {
    id: string;
    title: string;
    price: PrismaPkg.Prisma.Decimal;
    images: { url: string }[];
  }): ChatRoomListingSnapshot {
    return {
      id: listing.id,
      title: listing.title,
      price: Number(listing.price),
      imageUrl: listing.images[0]?.url ?? null,
    };
  }

  private mapCounterpartySnapshot(user: {
    id: string;
    nickname: string;
    profile: { avatar: string | null } | null;
  }): ChatRoomCounterpartySnapshot {
    return {
      userId: user.id,
      displayName: user.nickname,
      avatarUrl: user.profile?.avatar ?? null,
    };
  }

  private resolveCounterpartyUser(
    row: {
      buyerId: string;
      sellerId: string;
      buyer: {
        id: string;
        nickname: string;
        profile: { avatar: string | null } | null;
      };
      seller: {
        id: string;
        nickname: string;
        profile: { avatar: string | null } | null;
      };
    },
    viewerUserId: string,
  ) {
    return row.buyerId === viewerUserId ? row.seller : row.buyer;
  }

  private mapRoomSummary(
    row: {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      lastMessageId: string | null;
      lastMessagePreview: string | null;
      lastMessageType: PrismaPkg.MessageType | null;
      lastMessageAt: Date | null;
      unreadCountBuyer: number;
      unreadCountSeller: number;
      updatedAt: Date;
      listing: {
        id: string;
        title: string;
        price: PrismaPkg.Prisma.Decimal;
        images: { url: string }[];
      };
      buyer: {
        id: string;
        nickname: string;
        profile: { avatar: string | null } | null;
      };
      seller: {
        id: string;
        nickname: string;
        profile: { avatar: string | null } | null;
      };
    },
    viewerUserId: string,
  ): ChatRoomSummaryData {
    const unreadCount =
      row.buyerId === viewerUserId
        ? row.unreadCountBuyer
        : row.unreadCountSeller;
    const counterpartyUser = this.resolveCounterpartyUser(row, viewerUserId);
    return {
      chatRoomId: row.id,
      listingId: row.listingId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      latestMessageId: row.lastMessageId,
      latestMessageContent: row.lastMessagePreview,
      latestMessageType: row.lastMessageType as unknown as MessageType | null,
      latestMessageCreatedAt: row.lastMessageAt,
      unreadCount,
      updatedAt: row.updatedAt,
      listing: this.mapListingSnapshot(row.listing),
      counterparty: this.mapCounterpartySnapshot(counterpartyUser),
    };
  }

  private mapRoomDetail(
    row: {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      listing: {
        id: string;
        title: string;
        price: PrismaPkg.Prisma.Decimal;
        images: { url: string }[];
      };
      buyer: {
        id: string;
        nickname: string;
        profile: { avatar: string | null } | null;
      };
      seller: {
        id: string;
        nickname: string;
        profile: { avatar: string | null } | null;
      };
    },
    viewerUserId: string,
  ): ChatRoomData {
    const counterpartyUser = this.resolveCounterpartyUser(row, viewerUserId);
    return {
      id: row.id,
      listingId: row.listingId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      listing: this.mapListingSnapshot(row.listing),
      counterparty: this.mapCounterpartySnapshot(counterpartyUser),
    };
  }

  private mapMessage(row: {
    id: string;
    chatRoomId: string;
    senderId: string;
    type: PrismaPkg.MessageType;
    content: string;
    metadata: PrismaPkg.Prisma.JsonValue | null;
    isRead: boolean;
    createdAt: Date;
  }): ChatMessageData {
    return {
      id: row.id,
      chatRoomId: row.chatRoomId,
      senderId: row.senderId,
      type: row.type as unknown as MessageType,
      content: row.content,
      metadata: row.metadata as JsonValue | null,
      isRead: row.isRead,
      createdAt: row.createdAt,
    };
  }

  private mapTransaction(row: {
    id: string;
    listingId: string;
    chatRoomId: string;
    buyerId: string;
    sellerId: string;
    type: PrismaPkg.TransactionType;
    status: PrismaPkg.TransactionStatus;
    amount: PrismaPkg.Prisma.Decimal;
    buyerCompleted: boolean;
    sellerCompleted: boolean;
    buyerCompletedAt: Date | null;
    sellerCompletedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TransactionData {
    return {
      id: row.id,
      listingId: row.listingId,
      chatRoomId: row.chatRoomId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      type: row.type as unknown as TransactionType,
      status: row.status as unknown as TransactionStatus,
      amount: Number(row.amount),
      buyerCompleted: row.buyerCompleted,
      sellerCompleted: row.sellerCompleted,
      buyerCompletedAt: row.buyerCompletedAt,
      sellerCompletedAt: row.sellerCompletedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSafePayment(row: {
    id: string;
    transactionId: string;
    adminReceivingPhone: string | null;
    instructionSentAt: Date | null;
    instructionSentById: string | null;
    instructionNote: string | null;
    payerKbzName: string | null;
    payerKbzPhone: string | null;
    paymentAmount: PrismaPkg.Prisma.Decimal | null;
    kbzTransactionId: string | null;
    isVerified: boolean;
    verifiedById: string | null;
    verifiedAt: Date | null;
    isTransferred: boolean;
    transferredAt: Date | null;
    transferRef: string | null;
  }): SafePaymentData {
    return {
      id: row.id,
      transactionId: row.transactionId,
      adminReceivingPhone: row.adminReceivingPhone,
      instructionSentAt: row.instructionSentAt,
      instructionSentById: row.instructionSentById,
      instructionNote: row.instructionNote,
      payerKbzName: row.payerKbzName,
      payerKbzPhone: row.payerKbzPhone,
      paymentAmount:
        row.paymentAmount != null ? Number(row.paymentAmount) : null,
      kbzTransactionId: row.kbzTransactionId,
      isVerified: row.isVerified,
      verifiedById: row.verifiedById,
      verifiedAt: row.verifiedAt,
      isTransferred: row.isTransferred,
      transferredAt: row.transferredAt,
      transferRef: row.transferRef,
    };
  }

  private normalizeTake(value: number, max: number): number {
    return Math.max(1, Math.min(value, max));
  }

  private async createMessageWithRoomSnapshot(
    tx: PrismaPkg.Prisma.TransactionClient,
    data: CreateChatMessageData,
  ) {
    const room = await tx.chatRoom.findUnique({
      where: { id: data.chatRoomId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        unreadCountBuyer: true,
        unreadCountSeller: true,
      },
    });
    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    const row = await tx.chatMessage.create({
      data: {
        chatRoomId: data.chatRoomId,
        senderId: data.senderId,
        type: data.type as unknown as PrismaPkg.MessageType,
        content: data.content,
        metadata:
          (data.metadata as PrismaPkg.Prisma.InputJsonValue | undefined) ??
          PrismaPkg.Prisma.JsonNull,
      },
    });

    const nextUnreadBuyer =
      data.senderId === room.buyerId
        ? room.unreadCountBuyer
        : room.unreadCountBuyer + 1;
    const nextUnreadSeller =
      data.senderId === room.sellerId
        ? room.unreadCountSeller
        : room.unreadCountSeller + 1;

    await tx.chatRoom.update({
      where: { id: room.id },
      data: {
        updatedAt: row.createdAt,
        lastMessageId: row.id,
        lastMessageType: row.type,
        lastMessagePreview: this.toMessagePreview(row.content),
        lastMessageAt: row.createdAt,
        unreadCountBuyer: nextUnreadBuyer,
        unreadCountSeller: nextUnreadSeller,
      },
    });

    return row;
  }

  private toMessagePreview(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 180) {
      return normalized;
    }
    return `${normalized.slice(0, 180)}...`;
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string | null): CursorToken | null {
    if (!cursor) {
      return null;
    }
    try {
      const token = Buffer.from(cursor, 'base64url').toString('utf8');
      const [createdAtRaw, id] = token.split('|');
      if (!createdAtRaw || !id) {
        return null;
      }
      const createdAt = new Date(createdAtRaw);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }
      return { createdAt, id };
    } catch {
      return null;
    }
  }
}
