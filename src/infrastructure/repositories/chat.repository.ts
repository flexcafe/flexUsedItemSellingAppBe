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
  type ChatRoomData,
  type ChatRoomSummaryData,
  type CreateChatMessageData,
  type CreateChatRoomData,
  type DirectTradeData,
  type IChatRepository,
  type LocationShareData,
  type PendingSafePaymentData,
  type SafePaymentData,
  type SafePaymentSubmissionData,
  type TransactionData,
} from '../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../domain/enums/transaction-type.enum.js';
import type { JsonValue } from '../../domain/repositories/user.repository.interface.js';

const {
  MessageType: PrismaMessageType,
  TransactionStatus: PrismaTransactionStatus,
} = PrismaPkg;

type CursorToken = {
  createdAt: Date;
  id: string;
};

@Injectable()
export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateRoom(data: CreateChatRoomData): Promise<ChatRoomData> {
    const existing = await this.prisma.chatRoom.findUnique({
      where: {
        listingId_buyerId_sellerId: {
          listingId: data.listingId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
        },
      },
    });
    if (existing) {
      return this.mapRoom(existing);
    }
    const row = await this.prisma.chatRoom.create({
      data: {
        listingId: data.listingId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
      },
    });
    return this.mapRoom(row);
  }

  async findRoomById(chatRoomId: string): Promise<ChatRoomData | null> {
    const row = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
    });
    return row ? this.mapRoom(row) : null;
  }

  async listRoomsForUser(
    userId: string,
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<ChatRoomSummaryData>> {
    const pageSize = this.normalizeTake(take, 50);
    const decoded = this.decodeCursor(cursor);
    const rows = await this.prisma.chatRoom.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        ...(decoded
          ? {
              OR: [
                { updatedAt: { lt: decoded.createdAt } },
                {
                  updatedAt: decoded.createdAt,
                  id: { lt: decoded.id },
                },
              ],
            }
          : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });

    const hasNext = rows.length > pageSize;
    const slice = hasNext ? rows.slice(0, pageSize) : rows;

    const unreadCounts = await this.prisma.chatMessage.groupBy({
      by: ['chatRoomId'],
      where: {
        chatRoomId: { in: slice.map((r) => r.id) },
        isRead: false,
        senderId: { not: userId },
      },
      _count: { _all: true },
    });
    const unreadMap = new Map<string, number>(
      unreadCounts.map((r) => [r.chatRoomId, r._count._all]),
    );

    const items = slice.map((row) => {
      const latest = row.messages[0] ?? null;
      return {
        chatRoomId: row.id,
        listingId: row.listingId,
        buyerId: row.buyerId,
        sellerId: row.sellerId,
        latestMessageId: latest?.id ?? null,
        latestMessageContent: latest?.content ?? null,
        latestMessageType: latest
          ? (latest.type as unknown as MessageType)
          : null,
        latestMessageCreatedAt: latest?.createdAt ?? null,
        unreadCount: unreadMap.get(row.id) ?? 0,
        updatedAt: row.updatedAt,
      } satisfies ChatRoomSummaryData;
    });

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
    const row = await this.prisma.chatMessage.create({
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
    await this.prisma.chatRoom.update({
      where: { id: data.chatRoomId },
      data: { updatedAt: row.createdAt },
    });
    return this.mapMessage(row);
  }

  async markRoomMessagesRead(
    chatRoomId: string,
    userId: string,
  ): Promise<number> {
    const result = await this.prisma.chatMessage.updateMany({
      where: {
        chatRoomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
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
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapTransaction(row) : null;
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
      },
      create: {
        transactionId: data.transactionId,
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
        meetingLocation: data.meetingLocation ?? null,
        meetingLatitude: data.meetingLatitude ?? null,
        meetingLongitude: data.meetingLongitude ?? null,
      },
    });
  }

  async upsertLocationShare(data: LocationShareData): Promise<void> {
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
      return;
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
  }

  async stopLocationShare(
    directTradeId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.locationShare.updateMany({
      where: { directTradeId, userId, isActive: true },
      data: { isActive: false },
    });
  }

  async submitSafePayment(
    data: SafePaymentSubmissionData,
  ): Promise<SafePaymentData> {
    await this.prisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        status: PrismaTransactionStatus.SAFE_PAYMENT_PENDING,
        amount: data.paymentAmount,
      },
    });
    const row = await this.prisma.safePayment.upsert({
      where: { transactionId: data.transactionId },
      update: {
        payerKbzName: data.payerKbzName,
        payerKbzPhone: data.payerKbzPhone,
        paymentAmount: data.paymentAmount,
        kbzTransactionId: data.kbzTransactionId,
      },
      create: {
        transactionId: data.transactionId,
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
    adminReceivingPhone: string,
    adminNote?: string,
  ): Promise<TransactionData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const safePayment = await tx.safePayment.findUnique({
        where: { transactionId },
      });
      if (!safePayment) {
        throw new NotFoundException('Safe payment info not found');
      }

      await tx.safePayment.update({
        where: { transactionId },
        data: {
          isVerified: true,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
      });

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: PrismaTransactionStatus.SAFE_PAYMENT_RECEIVED,
        },
      });

      await tx.chatMessage.create({
        data: {
          chatRoomId: transaction.chatRoomId,
          senderId: adminId,
          type: PrismaMessageType.SAFE_PAYMENT_VERIFIED,
          content: 'Safe payment verified by admin.',
          metadata: {
            adminReceivingPhone,
            adminNote: adminNote ?? null,
            verifiedAt: new Date().toISOString(),
          },
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

      await tx.chatMessage.create({
        data: {
          chatRoomId: transaction.chatRoomId,
          senderId: adminId,
          type: PrismaMessageType.PAYMENT_TRANSFERRED,
          content: 'Admin transferred safe payment to seller.',
          metadata: {
            transferRef,
            adminNote: adminNote ?? null,
            transferredAt: new Date().toISOString(),
          },
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
        payerKbzName: r.safePayment!.payerKbzName,
        payerKbzPhone: r.safePayment!.payerKbzPhone,
        kbzTransactionId: r.safePayment!.kbzTransactionId,
        createdAt: r.createdAt,
      }));
    const last = slice.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  private mapRoom(row: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ChatRoomData {
    return {
      id: row.id,
      listingId: row.listingId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
    payerKbzName: string;
    payerKbzPhone: string;
    paymentAmount: PrismaPkg.Prisma.Decimal;
    kbzTransactionId: string;
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
      payerKbzName: row.payerKbzName,
      payerKbzPhone: row.payerKbzPhone,
      paymentAmount: Number(row.paymentAmount),
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
