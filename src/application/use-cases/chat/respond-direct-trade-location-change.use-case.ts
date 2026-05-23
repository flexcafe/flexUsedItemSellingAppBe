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
import {
  assertDirectTradeOpen,
  assertPendingLocationChange,
  assertSeller,
  loadDirectTradeFlow,
} from './_direct-trade-flow.helper.js';

@Injectable()
export class RespondDirectTradeLocationChangeUseCase {
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
    sellerId: string,
    chatRoomId: string,
    accepted: boolean,
  ): Promise<void> {
    const ctx = await loadDirectTradeFlow(
      this.chats,
      this.products,
      this.users,
      chatRoomId,
      sellerId,
    );
    assertSeller(ctx.room, sellerId);
    assertDirectTradeOpen(ctx.transaction);
    assertPendingLocationChange(ctx.directTrade);

    const requestedLocation = ctx.directTrade.buyerRequestedLocation!;

    if (accepted) {
      await this.chats.upsertDirectTrade({
        transactionId: ctx.transaction.id,
        meetingDate: ctx.directTrade.meetingDate,
        meetingTime: ctx.directTrade.meetingTime,
        meetingLocation: requestedLocation,
        meetingLatitude: ctx.directTrade.buyerRequestedLatitude ?? undefined,
        meetingLongitude: ctx.directTrade.buyerRequestedLongitude ?? undefined,
        acceptedLocationLabel: null,
        buyerRequestedLocation: null,
        buyerRequestedLatitude: null,
        buyerRequestedLongitude: null,
      });

      const systemMessage = await this.chats.createMessage({
        chatRoomId: ctx.room.id,
        senderId: sellerId,
        type: MessageType.DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED,
        content: `Seller accepted the buyer's meeting location: "${requestedLocation}".`,
        metadata: {
          transactionId: ctx.transaction.id,
          meetingLocation: requestedLocation,
          meetingLatitude: ctx.directTrade.buyerRequestedLatitude,
          meetingLongitude: ctx.directTrade.buyerRequestedLongitude,
        },
      });

      this.publisher.publish(
        ctx.room.id,
        ctx.room.buyerId,
        ctx.room.sellerId,
        systemMessage,
        'chat.directTrade.locationChangeAccepted',
      );
      return;
    }

    await this.chats.upsertDirectTrade({
      transactionId: ctx.transaction.id,
      meetingDate: ctx.directTrade.meetingDate,
      meetingTime: ctx.directTrade.meetingTime,
      meetingLocation: ctx.directTrade.meetingLocation ?? undefined,
      meetingLatitude: ctx.directTrade.meetingLatitude ?? undefined,
      meetingLongitude: ctx.directTrade.meetingLongitude ?? undefined,
      acceptedLocationLabel: ctx.directTrade.acceptedLocationLabel,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });

    const systemMessage = await this.chats.createMessage({
      chatRoomId: ctx.room.id,
      senderId: sellerId,
      type: MessageType.DIRECT_TRADE_LOCATION_CHANGE_DENIED,
      content: `Seller declined the buyer's location change request.`,
      metadata: {
        transactionId: ctx.transaction.id,
        declinedLocation: requestedLocation,
      },
    });

    this.publisher.publish(
      ctx.room.id,
      ctx.room.buyerId,
      ctx.room.sellerId,
      systemMessage,
      'chat.directTrade.locationChangeDenied',
    );
  }
}
