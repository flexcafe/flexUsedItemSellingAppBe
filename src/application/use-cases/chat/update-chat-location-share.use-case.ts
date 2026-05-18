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
import {
  CHAT_REALTIME,
  type IChatRealtime,
} from '../../../domain/services/chat-realtime.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class UpdateChatLocationShareUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
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
  ): Promise<void> {
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
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const { startedNewSession } = await this.chats.upsertLocationShare({
      directTradeId,
      userId,
      latitude,
      longitude,
      expiresAt,
    });

    if (startedNewSession) {
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
  }
}
