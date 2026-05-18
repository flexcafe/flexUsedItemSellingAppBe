import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class MarkChatRoomReadUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
  ) {}

  async execute(userId: string, chatRoomId: string): Promise<number> {
    await requireRoomParticipant(this.chats, chatRoomId, userId);
    return this.chats.markRoomMessagesRead(chatRoomId, userId);
  }
}
