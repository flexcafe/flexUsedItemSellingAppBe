import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { requireRoomParticipant } from './_helpers.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class MarkChatRoomReadUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(userId: string, chatRoomId: string): Promise<number> {
    await requireRoomParticipant(this.chats, this.users, chatRoomId, userId);
    return this.chats.markRoomMessagesRead(chatRoomId, userId);
  }
}
