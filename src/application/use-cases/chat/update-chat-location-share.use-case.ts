import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  CHAT_REALTIME,
  type IChatRealtime,
} from '../../../domain/services/chat-realtime.interface.js';
import { requireDirectTradeContext } from './_helpers.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { assertUserCanStartOrUpdateLiveLocation } from './_location-share.helper.js';

@Injectable()
export class UpdateChatLocationShareUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_REALTIME)
    private readonly realtime: IChatRealtime,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    latitude: number,
    longitude: number,
    expiresInSeconds: number,
  ): Promise<void> {
    const { room, directTradeId } = await requireDirectTradeContext(
      this.chats,
      this.users,
      chatRoomId,
      userId,
    );
    await assertUserCanStartOrUpdateLiveLocation(
      this.chats,
      chatRoomId,
      userId,
    );
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await this.chats.updateLocationShare({
      directTradeId,
      userId,
      latitude,
      longitude,
      expiresAt,
    });

    this.realtime.emitToChatRoom(room.id, 'chat.location.updated', {
      chatRoomId: room.id,
      userId,
      latitude,
      longitude,
      expiresAt: expiresAt.toISOString(),
    });
  }
}
