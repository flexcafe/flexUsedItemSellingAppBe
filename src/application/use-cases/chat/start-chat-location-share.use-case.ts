import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
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
export class StartChatLocationShareUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_REALTIME)
    private readonly realtime: IChatRealtime,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    latitude: number,
    longitude: number,
    expiresInSeconds: number,
  ): Promise<{ alreadyActive: boolean }> {
    const { room, transaction, directTradeId } =
      await requireDirectTradeContext(
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
    const { alreadyActive } = await this.chats.startLocationShare({
      directTradeId,
      userId,
      latitude,
      longitude,
      expiresAt,
    });

    if (!alreadyActive) {
      const systemMessage = await this.chats.createMessage({
        chatRoomId: room.id,
        senderId: userId,
        type: MessageType.LOCATION_SHARING_STARTED,
        content: 'Location sharing started.',
        metadata: {
          transactionId: transaction.id,
          userId,
          latitude,
          longitude,
          expiresAt: expiresAt.toISOString(),
        },
      });
      this.publisher.publish(
        room.id,
        room.buyerId,
        room.sellerId,
        systemMessage,
        'chat.location.started',
      );
    }

    this.realtime.emitToChatRoom(room.id, 'chat.location.updated', {
      chatRoomId: room.id,
      userId,
      latitude,
      longitude,
      expiresAt: expiresAt.toISOString(),
    });

    return { alreadyActive };
  }
}
