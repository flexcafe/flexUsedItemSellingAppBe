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
import { requireDirectTradeContext } from './_helpers.js';

@Injectable()
export class StopChatLocationShareUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(userId: string, chatRoomId: string): Promise<void> {
    const { room, transaction, directTradeId } =
      await requireDirectTradeContext(this.chats, chatRoomId, userId);
    await this.chats.stopLocationShare(directTradeId, userId);
    const systemMessage = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.LOCATION_SHARING_STOPPED,
      content: 'Location sharing stopped.',
      metadata: { transactionId: transaction.id },
    });
    this.publisher.publish(
      room.id,
      room.buyerId,
      room.sellerId,
      systemMessage,
      'chat.location.stopped',
    );
  }
}
