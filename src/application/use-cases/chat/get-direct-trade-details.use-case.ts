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
import { loadDirectTradeFlow } from './_direct-trade-flow.helper.js';
import type { ListingMeetingLocationOption } from './_listing-meeting-locations.helper.js';

export interface DirectTradeDetailResult {
  transactionId: string;
  listingId: string;
  meetingDate: Date;
  meetingTime: string;
  meetingLocation: string | null;
  meetingLatitude: number | null;
  meetingLongitude: number | null;
  selectedLocationLabel: string | null;
  pendingLocationChange: boolean;
  buyerRequestedLocation: string | null;
  buyerRequestedLatitude: number | null;
  buyerRequestedLongitude: number | null;
  listingLocations: ListingMeetingLocationOption[];
}

@Injectable()
export class GetDirectTradeDetailsUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: IProductRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
  ): Promise<DirectTradeDetailResult> {
    const ctx = await loadDirectTradeFlow(
      this.chats,
      this.products,
      this.users,
      chatRoomId,
      userId,
    );

    return {
      transactionId: ctx.directTrade.transactionId,
      listingId: ctx.room.listingId,
      meetingDate: ctx.directTrade.meetingDate,
      meetingTime: ctx.directTrade.meetingTime,
      meetingLocation: ctx.directTrade.meetingLocation,
      meetingLatitude: ctx.directTrade.meetingLatitude,
      meetingLongitude: ctx.directTrade.meetingLongitude,
      selectedLocationLabel: ctx.directTrade.acceptedLocationLabel,
      pendingLocationChange: ctx.directTrade.buyerRequestedLocation != null,
      buyerRequestedLocation: ctx.directTrade.buyerRequestedLocation,
      buyerRequestedLatitude: ctx.directTrade.buyerRequestedLatitude,
      buyerRequestedLongitude: ctx.directTrade.buyerRequestedLongitude,
      listingLocations: ctx.listingLocations,
    };
  }
}
