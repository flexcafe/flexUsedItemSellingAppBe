import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { requireActiveChatUser } from './_helpers.js';

@Injectable()
export class ListChatRoomsUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(userId: string, cursor: string | null, take: number) {
    await requireActiveChatUser(this.users, userId);
    return this.chats.listRoomsForUser(userId, cursor, take);
  }
}
