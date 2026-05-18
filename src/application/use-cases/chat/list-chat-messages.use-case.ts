import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class ListChatMessagesUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    cursor: string | null,
    take: number,
  ) {
    const room = await requireRoomParticipant(this.chats, chatRoomId, userId);
    return this.chats.listMessagesByRoom(room.id, cursor, take);
  }
}
