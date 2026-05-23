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
  assertBuyer,
  assertDirectTradeOpen,
  assertNoPendingLocationChange,
  loadDirectTradeFlow,
  requireListingLocation,
} from './_direct-trade-flow.helper.js';

interface AcceptLocationInput {
  chatRoomId: string;
  userId: string;
  locationLabel: string;
}

@Injectable()
export class AcceptDirectTradeLocationUseCase {
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
    input: AcceptLocationInput,
  ): Promise<{ label: string; transactionId: string }> {
    const ctx = await loadDirectTradeFlow(
      this.chats,
      this.products,
      this.users,
      input.chatRoomId,
      input.userId,
    );
    assertBuyer(ctx.room, input.userId);
    assertDirectTradeOpen(ctx.transaction);
    assertNoPendingLocationChange(ctx.directTrade);

    const matchedLoc = requireListingLocation(ctx.listing, input.locationLabel);

    await this.chats.upsertDirectTrade({
      transactionId: ctx.transaction.id,
      meetingDate: ctx.directTrade.meetingDate,
      meetingTime: ctx.directTrade.meetingTime,
      meetingLocation: matchedLoc.address,
      meetingLatitude: matchedLoc.latitude ?? undefined,
      meetingLongitude: matchedLoc.longitude ?? undefined,
      acceptedLocationLabel: input.locationLabel,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });

    const systemMessage = await this.chats.createMessage({
      chatRoomId: ctx.room.id,
      senderId: input.userId,
      type: MessageType.DIRECT_TRADE_LOCATION_ACCEPTED,
      content: `Buyer chose meeting location: "${input.locationLabel}".`,
      metadata: {
        transactionId: ctx.transaction.id,
        listingId: ctx.listing.id,
        selectedLocationLabel: input.locationLabel,
        address: matchedLoc.address,
        latitude: matchedLoc.latitude,
        longitude: matchedLoc.longitude,
      },
    });

    this.publisher.publish(
      ctx.room.id,
      ctx.room.buyerId,
      ctx.room.sellerId,
      systemMessage,
      'chat.directTrade.locationAccepted',
    );

    return { label: input.locationLabel, transactionId: ctx.transaction.id };
  }
}
