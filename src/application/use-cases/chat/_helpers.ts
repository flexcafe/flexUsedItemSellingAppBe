import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type {
  ChatRoomData,
  IChatRepository,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';

export async function requireRoomParticipant(
  chats: IChatRepository,
  chatRoomId: string,
  userId: string,
): Promise<ChatRoomData> {
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
  chatRoomId: string,
  userId: string,
): Promise<{
  room: ChatRoomData;
  transaction: TransactionData;
  directTradeId: string;
}> {
  const room = await requireRoomParticipant(chats, chatRoomId, userId);
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
