import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChatRoomData,
  IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

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
