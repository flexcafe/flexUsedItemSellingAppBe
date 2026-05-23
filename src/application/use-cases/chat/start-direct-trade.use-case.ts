import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import type { StartDirectTradeDto } from '../../dtos/chat/chat.dto.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import { requireRoomParticipant } from './_helpers.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  assertDirectTradeOpen,
  assertListingHasMeetingLocations,
  buildDirectTradeStartData,
} from './_direct-trade-flow.helper.js';
import {
  buildListingMeetingLocations,
  requireListingForChat,
} from './_listing-meeting-locations.helper.js';

@Injectable()
export class StartDirectTradeUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: IProductRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    dto: StartDirectTradeDto,
  ): Promise<TransactionData> {
    const room = await requireRoomParticipant(
      this.chats,
      this.users,
      chatRoomId,
      userId,
    );
    const listing = await requireListingForChat(this.products, room.listingId);
    const listingLocations = buildListingMeetingLocations(listing);
    assertListingHasMeetingLocations(listingLocations);

    const existing = await this.chats.findTransactionForChat(
      room.id,
      TransactionType.DIRECT_TRADE,
    );
    if (existing) {
      assertDirectTradeOpen(existing);
    }

    const transaction = await this.chats.getOrCreateTransaction(
      room.id,
      room.listingId,
      room.buyerId,
      room.sellerId,
      TransactionType.DIRECT_TRADE,
      0,
    );

    await this.chats.upsertDirectTrade(
      buildDirectTradeStartData(
        transaction.id,
        new Date(dto.meetingDate),
        dto.meetingTime,
      ),
    );

    const systemMessage = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      type: MessageType.DIRECT_TRADE_REQUEST,
      content: 'Direct trade requested with meeting details.',
      metadata: {
        transactionId: transaction.id,
        listingId: listing.id,
        meetingDate: dto.meetingDate,
        meetingTime: dto.meetingTime,
        listingLocations: listingLocations.map((loc) => ({
          label: loc.label,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
        })),
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
