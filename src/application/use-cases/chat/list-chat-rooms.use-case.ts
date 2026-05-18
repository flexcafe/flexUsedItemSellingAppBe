import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';

@Injectable()
export class ListChatRoomsUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
  ) {}

  execute(userId: string, cursor: string | null, take: number) {
    return this.chats.listRoomsForUser(userId, cursor, take);
  }
}
