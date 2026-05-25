import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ListingEntity } from '../../../domain/entities/listing.entity.js';
import type {
  ChatRoomParticipantData,
  DirectTradeData,
  DirectTradeRecord,
  IChatRepository,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import { requireRoomParticipant } from './_helpers.js';
import {
  buildListingMeetingLocations,
  findListingMeetingLocation,
  requireListingForChat,
  type ListingMeetingLocationOption,
} from './_listing-meeting-locations.helper.js';

const CLOSED_TRANSACTION_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.BUYER_COMPLETED,
  TransactionStatus.SELLER_COMPLETED,
  TransactionStatus.COMPLETED,
  TransactionStatus.CANCELLED,
  TransactionStatus.REFUNDED,
]);

export interface DirectTradeFlowContext {
  room: ChatRoomParticipantData;
  transaction: TransactionData;
  directTrade: DirectTradeRecord;
  listing: ListingEntity;
  listingLocations: ListingMeetingLocationOption[];
}

/** New or restarted meetup proposal — date/time only; place must be chosen again. */
export function buildDirectTradeStartData(
  transactionId: string,
  meetingDate: Date,
  meetingTime: string,
): DirectTradeData {
  return {
    transactionId,
    meetingDate,
    meetingTime,
    meetingLocation: null,
    meetingLatitude: null,
    meetingLongitude: null,
    acceptedLocationLabel: null,
    buyerRequestedLocation: null,
    buyerRequestedLatitude: null,
    buyerRequestedLongitude: null,
  };
}

export async function loadDirectTradeFlow(
  chats: IChatRepository,
  products: IProductRepository,
  users: IUserRepository,
  chatRoomId: string,
  userId: string,
): Promise<DirectTradeFlowContext> {
  const room = await requireRoomParticipant(chats, users, chatRoomId, userId);
  const listing = await requireListingForChat(products, room.listingId);
  const activeDealChatRoomId = await products.getActiveDealChatRoomId(
    room.listingId,
  );
  if (!activeDealChatRoomId || activeDealChatRoomId !== room.id) {
    throw new ForbiddenException(
      'This chat is not the active deal for this listing',
    );
  }
  const listingLocations = buildListingMeetingLocations(listing);

  const transaction = await chats.findTransactionForChat(
    room.id,
    TransactionType.DIRECT_TRADE,
  );
  if (!transaction) {
    throw new NotFoundException(
      'Start direct trade first (meeting date and time)',
    );
  }

  const directTrade = await chats.findDirectTradeByTransactionId(
    transaction.id,
  );
  if (!directTrade) {
    throw new NotFoundException('Direct trade details not found');
  }

  return { room, transaction, directTrade, listing, listingLocations };
}

export function assertDirectTradeOpen(transaction: TransactionData): void {
  if (CLOSED_TRANSACTION_STATUSES.has(transaction.status)) {
    throw new BadRequestException(
      'Direct trade is closed; location can no longer be changed',
    );
  }
}

export function assertBuyer(
  room: ChatRoomParticipantData,
  userId: string,
): void {
  if (room.buyerId !== userId) {
    throw new ForbiddenException('Only the buyer can perform this action');
  }
}

export function assertSeller(
  room: ChatRoomParticipantData,
  userId: string,
): void {
  if (room.sellerId !== userId) {
    throw new ForbiddenException('Only the seller can perform this action');
  }
}

export function assertListingHasMeetingLocations(
  listingLocations: ListingMeetingLocationOption[],
): void {
  if (listingLocations.length === 0) {
    throw new BadRequestException(
      'This listing has no direct-trade meeting locations. The seller must add them on the product first.',
    );
  }
}

export function assertNoPendingLocationChange(
  directTrade: DirectTradeRecord,
): void {
  if (directTrade.buyerRequestedLocation) {
    throw new BadRequestException(
      'A location change request is already pending seller response',
    );
  }
}

export function assertPendingLocationChange(
  directTrade: DirectTradeRecord,
): void {
  if (!directTrade.buyerRequestedLocation) {
    throw new BadRequestException('No pending location change request');
  }
}

/** Buyer must use accept-location for spots already on the listing. */
export function assertNotListingLocation(
  listing: ListingEntity,
  meetingLocation: string,
): void {
  const normalized = meetingLocation.trim().toLowerCase();
  for (const opt of buildListingMeetingLocations(listing)) {
    if (opt.address.trim().toLowerCase() === normalized) {
      throw new BadRequestException(
        'This place is already on the listing. Choose it with accept-location instead.',
      );
    }
    if (opt.label.trim().toLowerCase() === normalized) {
      throw new BadRequestException(
        'This place is already on the listing. Choose it with accept-location instead.',
      );
    }
  }
}

export function requireListingLocation(
  listing: ListingEntity,
  locationLabel: string,
): ListingMeetingLocationOption {
  const matched = findListingMeetingLocation(listing, locationLabel);
  if (!matched) {
    throw new NotFoundException(
      `Location "${locationLabel}" is not offered on this listing`,
    );
  }
  return matched;
}

/**
 * When a direct trade was started for this chat (meetup path), both parties must
 * agree on a place before completing either DIRECT_TRADE (cash) or SAFE_PAYMENT.
 * Delivery-only chats (safe payment with no direct trade) skip this check.
 */
export async function assertMeetupLocationAgreedForCompletion(
  chats: IChatRepository,
  chatRoomId: string,
): Promise<void> {
  const directTradeTxn = await chats.findTransactionForChat(
    chatRoomId,
    TransactionType.DIRECT_TRADE,
  );
  if (!directTradeTxn) {
    return;
  }

  const directTrade = await chats.findDirectTradeByTransactionId(
    directTradeTxn.id,
  );
  if (!directTrade) {
    throw new BadRequestException(
      'Start direct trade and agree on a meeting place before completing',
    );
  }

  if (directTrade.buyerRequestedLocation) {
    throw new BadRequestException(
      'Resolve the pending meeting location change before completing',
    );
  }

  const location = directTrade.meetingLocation?.trim();
  if (!location) {
    throw new BadRequestException(
      'Agree on a meeting place before completing (buyer picks a listing location or seller accepts a new one)',
    );
  }
}

/** Custom location requests only after a listing spot was chosen or a place was already agreed. */
export function assertBuyerMustPickListingBeforeLocationChange(
  directTrade: DirectTradeRecord,
): void {
  const hasAgreedPlace =
    Boolean(directTrade.meetingLocation?.trim()) ||
    Boolean(directTrade.acceptedLocationLabel?.trim());
  if (!hasAgreedPlace) {
    throw new BadRequestException(
      'Choose a listing meeting location with accept-location before requesting a different place',
    );
  }
}
