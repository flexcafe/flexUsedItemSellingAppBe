import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChatRoomParticipantData,
  IChatRepository,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { UserEntity } from '../../../domain/entities/user.entity.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import { assertMeetupLocationAgreedForCompletion } from './_direct-trade-flow.helper.js';

const SAFE_PAYMENT_COMPLETABLE_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.SAFE_PAYMENT_RECEIVED,
  TransactionStatus.BUYER_COMPLETED,
  TransactionStatus.SELLER_COMPLETED,
  TransactionStatus.COMPLETED,
]);

export async function requireActiveChatUser(
  users: IUserRepository,
  userId: string,
): Promise<UserEntity> {
  const user = await users.findById(userId);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  if (!user.isActiveUser()) {
    throw new ForbiddenException('Account is deactivated or banned');
  }
  return user;
}

export async function requireRoomParticipant(
  chats: IChatRepository,
  users: IUserRepository,
  chatRoomId: string,
  userId: string,
): Promise<ChatRoomParticipantData> {
  await requireActiveChatUser(users, userId);
  const room = await chats.findRoomById(chatRoomId);
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }
  if (room.buyerId !== userId && room.sellerId !== userId) {
    throw new ForbiddenException('Not part of this chat room');
  }
  return room;
}

export async function requireDirectTradeContext(
  chats: IChatRepository,
  users: IUserRepository,
  chatRoomId: string,
  userId: string,
): Promise<{
  room: ChatRoomParticipantData;
  transaction: TransactionData;
  directTradeId: string;
}> {
  const room = await requireRoomParticipant(chats, users, chatRoomId, userId);
  const transaction = await chats.findTransactionForChat(
    room.id,
    TransactionType.DIRECT_TRADE,
  );
  if (!transaction) {
    throw new NotFoundException('Direct trade transaction not found');
  }
  const directTradeId = await chats.findDirectTradeIdByTransactionId(
    transaction.id,
  );
  if (!directTradeId) {
    throw new NotFoundException('Direct trade details not found');
  }
  return { room, transaction, directTradeId };
}

export async function assertTransactionCompletable(
  chats: IChatRepository,
  transaction: TransactionData,
): Promise<void> {
  if (transaction.type === TransactionType.SAFE_PAYMENT) {
    if (!SAFE_PAYMENT_COMPLETABLE_STATUSES.has(transaction.status)) {
      throw new BadRequestException(
        'Cannot complete until admin has confirmed safe payment received',
      );
    }
    await assertMeetupLocationAgreedForCompletion(
      chats,
      transaction.chatRoomId,
    );
    return;
  }

  if (transaction.type === TransactionType.DIRECT_TRADE) {
    const safePayment = await chats.findBlockingSafePaymentForChat(
      transaction.chatRoomId,
    );
    if (!safePayment) {
      await assertMeetupLocationAgreedForCompletion(
        chats,
        transaction.chatRoomId,
      );
      return;
    }
    if (safePayment.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'This trade was already completed via safe payment',
      );
    }
    throw new BadRequestException(
      'Safe payment was started for this chat. Finish the safe payment flow and use Transaction Complete on that payment before direct trade completion',
    );
  }
}

export async function requireAdmin(
  users: IUserRepository,
  userId: string,
): Promise<void> {
  const user = await users.findById(userId);
  if (!user) {
    throw new NotFoundException('Admin not found');
  }
  if (!user.isAdmin()) {
    throw new ForbiddenException('Only admins can perform this action');
  }
}
