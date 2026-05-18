import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import type { StartDirectTradeDto } from '../../dtos/chat/chat.dto.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class StartDirectTradeUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    dto: StartDirectTradeDto,
  ): Promise<TransactionData> {
    const room = await requireRoomParticipant(this.chats, chatRoomId, userId);
    const transaction = await this.chats.getOrCreateTransaction(
      room.id,
      room.listingId,
      room.buyerId,
      room.sellerId,
      TransactionType.DIRECT_TRADE,
      0,
    );
    await this.chats.upsertDirectTrade({
      transactionId: transaction.id,
      meetingDate: new Date(dto.meetingDate),
      meetingTime: dto.meetingTime,
      meetingLocation: dto.meetingLocation,
      meetingLatitude: dto.meetingLatitude,
      meetingLongitude: dto.meetingLongitude,
    });
    const systemMessage = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.DIRECT_TRADE_REQUEST,
      content: 'Direct trade requested with meeting details.',
      metadata: {
        transactionId: transaction.id,
        meetingDate: dto.meetingDate,
        meetingTime: dto.meetingTime,
        meetingLocation: dto.meetingLocation ?? null,
        meetingLatitude: dto.meetingLatitude ?? null,
        meetingLongitude: dto.meetingLongitude ?? null,
      },
    });
    this.publisher.publish(
      room.id,
      room.buyerId,
      room.sellerId,
      systemMessage,
      'chat.directTrade.requested',
    );
    return transaction;
  }
}
