import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class UpdateChatLocationShareUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    private readonly realtime: ChatRealtimeService,
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
    await this.chats.upsertLocationShare({
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
