import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class StopChatLocationShareUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(userId: string, chatRoomId: string): Promise<void> {
    const room = await requireRoomParticipant(this.chats, chatRoomId, userId);
    const transaction = await this.chats.findTransactionForChat(
      room.id,
      TransactionType.DIRECT_TRADE,
    );
    if (!transaction) {
      throw new NotFoundException('Direct trade transaction not found');
    }
    const directTradeId = await this.chats.findDirectTradeIdByTransactionId(
      transaction.id,
    );
    if (!directTradeId) {
      throw new NotFoundException('Direct trade details not found');
    }
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
