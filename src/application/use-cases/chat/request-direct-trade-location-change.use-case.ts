import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import type { RequestLocationChangeDto } from '../../dtos/chat/direct-trade.dto.js';
import {
  assertBuyer,
  assertBuyerMustPickListingBeforeLocationChange,
  assertDirectTradeOpen,
  assertNoPendingLocationChange,
  assertNotListingLocation,
  loadDirectTradeFlow,
} from './_direct-trade-flow.helper.js';

@Injectable()
export class RequestDirectTradeLocationChangeUseCase {
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
    dto: RequestLocationChangeDto,
  ): Promise<void> {
    const ctx = await loadDirectTradeFlow(
      this.chats,
      this.products,
      this.users,
      chatRoomId,
      userId,
    );
    assertBuyer(ctx.room, userId);
    assertDirectTradeOpen(ctx.transaction);
    assertNoPendingLocationChange(ctx.directTrade);
    assertBuyerMustPickListingBeforeLocationChange(ctx.directTrade);
    assertNotListingLocation(ctx.listing, dto.meetingLocation);

    await this.chats.upsertDirectTrade({
      transactionId: ctx.transaction.id,
      meetingDate: ctx.directTrade.meetingDate,
      meetingTime: dto.meetingTime,
      meetingLocation: ctx.directTrade.meetingLocation ?? undefined,
      meetingLatitude: ctx.directTrade.meetingLatitude ?? undefined,
      meetingLongitude: ctx.directTrade.meetingLongitude ?? undefined,
      acceptedLocationLabel: null,
      buyerRequestedLocation: dto.meetingLocation,
      buyerRequestedLatitude: dto.meetingLatitude ?? null,
      buyerRequestedLongitude: dto.meetingLongitude ?? null,
    });

    const systemMessage = await this.chats.createMessage({
      chatRoomId: ctx.room.id,
      senderId: userId,
      type: MessageType.DIRECT_TRADE_LOCATION_CHANGE_REQUESTED,
      content: `Buyer requested a different meeting location: "${dto.meetingLocation}".`,
      metadata: {
        transactionId: ctx.transaction.id,
        meetingTime: dto.meetingTime,
        meetingLocation: dto.meetingLocation,
        meetingLatitude: dto.meetingLatitude ?? null,
        meetingLongitude: dto.meetingLongitude ?? null,
      },
    });

    this.publisher.publish(
      ctx.room.id,
      ctx.room.buyerId,
      ctx.room.sellerId,
      systemMessage,
      'chat.directTrade.locationChangeRequested',
    );
  }
}
