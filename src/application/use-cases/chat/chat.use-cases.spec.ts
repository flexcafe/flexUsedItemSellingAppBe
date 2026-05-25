import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OpenChatRoomUseCase } from './open-chat-room.use-case.js';
import { ListChatRoomsUseCase } from './list-chat-rooms.use-case.js';
import { ListChatMessagesUseCase } from './list-chat-messages.use-case.js';
import { SendChatMessageUseCase } from './send-chat-message.use-case.js';
import { MarkChatRoomReadUseCase } from './mark-chat-room-read.use-case.js';
import { GetChatSafePaymentStatusUseCase } from './get-chat-safe-payment-status.use-case.js';
import { RequestChatSafePaymentUseCase } from './request-chat-safe-payment.use-case.js';
import { SubmitChatSafePaymentUseCase } from './submit-chat-safe-payment.use-case.js';
import { CompleteChatTransactionUseCase } from './complete-chat-transaction.use-case.js';
import { AdminMarkSafePaymentTransferredUseCase } from './admin-mark-safe-payment-transferred.use-case.js';
import { AdminSendSafePaymentInstructionUseCase } from './admin-send-safe-payment-instruction.use-case.js';
import { AdminMarkSafePaymentReceivedUseCase } from './admin-mark-safe-payment-received.use-case.js';
import { StartDirectTradeUseCase } from './start-direct-trade.use-case.js';
import { StartChatLocationShareUseCase } from './start-chat-location-share.use-case.js';
import { SubmitChatReviewAfterCompletionUseCase } from './submit-chat-review-after-completion.use-case.js';
import { AcceptDirectTradeLocationUseCase } from './accept-direct-trade-location.use-case.js';
import { RequestDirectTradeLocationChangeUseCase } from './request-direct-trade-location-change.use-case.js';
import { RespondDirectTradeLocationChangeUseCase } from './respond-direct-trade-location-change.use-case.js';
import { CreateTransactionReviewUseCase } from '../points/create-transaction-review.use-case.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PreferredTradeLocationEntity } from '../../../domain/entities/preferred-trade-location.entity.js';
import {
  buildActiveUserMock,
  buildChatMessage,
  buildChatRepoMock,
  buildChatRoom,
  buildIdempotencyMock,
  buildProductRepoMock,
  buildPublisherMock,
  buildRealtimeMock,
  buildTransaction,
  buildUserRepoMock,
  BUYER_ID,
  LISTING_ID,
  ROOM_ID,
  SELLER_ID,
  TX_ID,
} from './_chat-test-mocks.js';

function buildOpenChatListing(
  status: ListingStatus,
  sellerId: string = SELLER_ID,
): ListingEntity {
  return new ListingEntity({
    id: LISTING_ID,
    title: 'Phone',
    description: 'desc',
    price: 100_000,
    condition: ListingCondition.GOOD,
    status,
    paymentMethods: [PaymentMethod.CASH],
    directTradeLocation: null,
    directTradeLatitude: null,
    directTradeLongitude: null,
    mapScreenshotUrl: null,
    nearbyLandmarks: null,
    preferredTradeTime: null,
    isDeliveryAvailable: false,
    deliveryFeePayer: null,
    images: [],
    isDeleted: false,
    viewCount: 0,
    sellerId,
    categoryId: 'cat-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredLocations: [],
  });
}

function buildListingWithMeetingLocations(): ListingEntity {
  return new ListingEntity({
    id: LISTING_ID,
    title: 'Phone',
    description: 'd',
    price: 100_000,
    condition: ListingCondition.GOOD,
    status: ListingStatus.ACTIVE,
    paymentMethods: [PaymentMethod.CASH],
    directTradeLocation: 'Junction City',
    directTradeLatitude: 16.784,
    directTradeLongitude: 96.157,
    mapScreenshotUrl: null,
    nearbyLandmarks: null,
    preferredTradeTime: null,
    isDeliveryAvailable: false,
    deliveryFeePayer: null,
    images: [],
    isDeleted: false,
    viewCount: 0,
    sellerId: SELLER_ID,
    categoryId: 'cat-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredLocations: [
      new PreferredTradeLocationEntity({
        id: 'loc-1',
        label: 'Spot A',
        address: 'Address A',
        latitude: 16.78,
        longitude: 96.15,
        sortOrder: 0,
      }),
    ],
  });
}

describe(OpenChatRoomUseCase.name, () => {
  it('rejects when listing is missing', async () => {
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue(null);
    const useCase = new OpenChatRoomUseCase(
      buildChatRepoMock(),
      products,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when seller tries to open chat as buyer', async () => {
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue(
      buildOpenChatListing(ListingStatus.ACTIVE),
    );
    const useCase = new OpenChatRoomUseCase(
      buildChatRepoMock(),
      products,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute(SELLER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when requested seller does not own listing', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue(
      buildOpenChatListing(
        ListingStatus.ACTIVE,
        '77777777-7777-7777-7777-777777777777',
      ),
    );
    const useCase = new OpenChatRoomUseCase(chats, products, buildUserRepoMock());

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.getOrCreateRoom).not.toHaveBeenCalled();
  });

  it('rejects when buyer or seller account is missing', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const users = buildUserRepoMock();
    products.findById.mockResolvedValue(
      buildOpenChatListing(ListingStatus.ACTIVE),
    );
    users.findById.mockImplementation(async (id: string) =>
      id === BUYER_ID ? null : (buildActiveUserMock({ id }) as never),
    );
    const useCase = new OpenChatRoomUseCase(chats, products, users);

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(chats.getOrCreateRoom).not.toHaveBeenCalled();
  });

  it('rejects when listing is not active', async () => {
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue(
      buildOpenChatListing(ListingStatus.SOLD),
    );
    const useCase = new OpenChatRoomUseCase(
      buildChatRepoMock(),
      products,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when buyer is banned', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const users = buildUserRepoMock();
    products.findById.mockResolvedValue(
      buildOpenChatListing(ListingStatus.ACTIVE),
    );
    users.findById.mockImplementation(async (id: string) =>
      id === BUYER_ID
        ? (buildActiveUserMock({ id, active: false }) as never)
        : (buildActiveUserMock({ id }) as never),
    );
    const useCase = new OpenChatRoomUseCase(chats, products, users);

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(chats.getOrCreateRoom).not.toHaveBeenCalled();
  });

  it('creates room for valid buyer', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const users = buildUserRepoMock();
    const room = buildChatRoom();

    products.findById.mockResolvedValue(
      buildOpenChatListing(ListingStatus.ACTIVE),
    );
    users.findById.mockImplementation(async (id: string) =>
      buildActiveUserMock({ id }) as never,
    );
    chats.getOrCreateRoom.mockResolvedValue(room);

    const useCase = new OpenChatRoomUseCase(chats, products, users);
    const result = await useCase.execute(BUYER_ID, {
      listingId: LISTING_ID,
      sellerId: SELLER_ID,
    });

    expect(result).toBe(room);
    expect(chats.getOrCreateRoom).toHaveBeenCalledWith(
      {
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
      },
      BUYER_ID,
    );
  });
});

describe(ListChatRoomsUseCase.name, () => {
  it('delegates to repository with cursor pagination', async () => {
    const chats = buildChatRepoMock();
    const page = { items: [], nextCursor: 'abc' };
    chats.listRoomsForUser.mockResolvedValue(page);

    const useCase = new ListChatRoomsUseCase(chats, buildUserRepoMock());
    const result = await useCase.execute(BUYER_ID, 'cursor-1', 20);

    expect(result).toBe(page);
    expect(chats.listRoomsForUser).toHaveBeenCalledWith(
      BUYER_ID,
      'cursor-1',
      20,
    );
  });
});

describe(ListChatMessagesUseCase.name, () => {
  it('throws when user is not a room participant', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new ListChatMessagesUseCase(chats, buildUserRepoMock());
    await expect(
      useCase.execute(
        '99999999-9999-9999-9999-999999999999',
        ROOM_ID,
        null,
        20,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe(SendChatMessageUseCase.name, () => {
  it('creates message and publishes to room participants', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const message = buildChatMessage();

    chats.findRoomById.mockResolvedValue(room);
    chats.createMessage.mockResolvedValue(message);

    const useCase = new SendChatMessageUseCase(
      chats,
      buildUserRepoMock(),
      idempotency,
      publisher,
    );
    const result = await useCase.execute(BUYER_ID, ROOM_ID, 'hi');

    expect(result).toBe(message);
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      message,
    );
  });

  it('rejects duplicate idempotency key', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    const publisher = buildPublisherMock();

    chats.findRoomById.mockResolvedValue(buildChatRoom());
    idempotency.reserve.mockResolvedValue(false);

    const useCase = new SendChatMessageUseCase(
      chats,
      buildUserRepoMock(),
      idempotency,
      publisher,
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, 'hi', MessageType.TEXT, 'dup-key'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(chats.createMessage).not.toHaveBeenCalled();
  });

  it('rejects system message types from clients', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    const useCase = new SendChatMessageUseCase(
      chats,
      buildUserRepoMock(),
      buildIdempotencyMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(
        BUYER_ID,
        ROOM_ID,
        'fake',
        MessageType.SAFE_PAYMENT_VERIFIED,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.createMessage).not.toHaveBeenCalled();
  });

  it('reserves idempotency key and supports IMAGE messages', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    const publisher = buildPublisherMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.createMessage.mockResolvedValue(
      buildChatMessage({ type: MessageType.IMAGE }),
    );
    const useCase = new SendChatMessageUseCase(
      chats,
      buildUserRepoMock(),
      idempotency,
      publisher,
    );

    await useCase.execute(
      BUYER_ID,
      ROOM_ID,
      'https://cdn.local/image.png',
      MessageType.IMAGE,
      'img-1',
    );

    expect(idempotency.reserve).toHaveBeenCalledWith(
      `chat:message:${ROOM_ID}:${BUYER_ID}:img-1`,
      180,
    );
    expect(chats.createMessage).toHaveBeenCalledWith({
      chatRoomId: ROOM_ID,
      senderId: BUYER_ID,
      content: 'https://cdn.local/image.png',
      type: MessageType.IMAGE,
    });
  });
});

describe(StartDirectTradeUseCase.name, () => {
  it('creates/updates direct trade and publishes system message', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const tx = buildTransaction({
      type: TransactionType.DIRECT_TRADE,
      amount: 0,
    });
    const message = buildChatMessage({
      type: MessageType.DIRECT_TRADE_REQUEST,
    });
    const listing = buildListingWithMeetingLocations();
    chats.findRoomById.mockResolvedValue(room);
    chats.getOrCreateTransaction.mockResolvedValue(tx);
    chats.createMessage.mockResolvedValue(message);
    products.findById.mockResolvedValue(listing);
    const useCase = new StartDirectTradeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      publisher,
    );

    const dto = {
      meetingDate: '2026-06-01',
      meetingTime: '18:30',
    };
    const result = await useCase.execute(BUYER_ID, ROOM_ID, dto);

    expect(result).toBe(tx);
    expect(chats.getOrCreateTransaction).toHaveBeenCalledWith(
      ROOM_ID,
      LISTING_ID,
      BUYER_ID,
      SELLER_ID,
      TransactionType.DIRECT_TRADE,
      0,
    );
    expect(chats.upsertDirectTrade).toHaveBeenCalledWith({
      transactionId: tx.id,
      meetingDate: new Date(dto.meetingDate),
      meetingTime: dto.meetingTime,
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    expect(chats.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.DIRECT_TRADE_REQUEST,
        metadata: expect.objectContaining({
          listingId: LISTING_ID,
          listingLocations: expect.arrayContaining([
            expect.objectContaining({ label: 'Primary' }),
            expect.objectContaining({ label: 'Spot A' }),
          ]),
        }),
      }),
    );
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      message,
      'chat.directTrade.requested',
    );
  });

  it('rejects direct trade when seller has not selected an active deal', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.getActiveDealChatRoomId.mockResolvedValue(null);
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    const useCase = new StartDirectTradeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        meetingDate: '2026-06-01',
        meetingTime: '18:30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.getOrCreateTransaction).not.toHaveBeenCalled();
    expect(chats.createMessage).not.toHaveBeenCalled();
  });

  it('rejects direct trade when another chat is the active deal', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.getActiveDealChatRoomId.mockResolvedValue(
      '99999999-9999-9999-9999-999999999999',
    );
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    const useCase = new StartDirectTradeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        meetingDate: '2026-06-01',
        meetingTime: '18:30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.getOrCreateTransaction).not.toHaveBeenCalled();
  });

  it('rejects restarting direct trade after either party has completed it', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.BUYER_COMPLETED,
        buyerCompleted: true,
      }),
    );
    const useCase = new StartDirectTradeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        meetingDate: '2026-06-01',
        meetingTime: '18:30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.getOrCreateTransaction).not.toHaveBeenCalled();
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });
});

describe(AcceptDirectTradeLocationUseCase.name, () => {
  it('lets buyer pick a listing meeting spot and stores the agreed place', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const publisher = buildPublisherMock();
    const transaction = buildTransaction({
      type: TransactionType.DIRECT_TRADE,
      status: TransactionStatus.INITIATED,
    });
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.findTransactionForChat.mockResolvedValue(transaction);
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: transaction.id,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    chats.createMessage.mockResolvedValue(
      buildChatMessage({ type: MessageType.DIRECT_TRADE_LOCATION_ACCEPTED }),
    );
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());

    const useCase = new AcceptDirectTradeLocationUseCase(
      chats,
      products,
      buildUserRepoMock(),
      publisher,
    );
    await useCase.execute({
      chatRoomId: ROOM_ID,
      userId: BUYER_ID,
      locationLabel: 'Spot A',
    });

    expect(chats.upsertDirectTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: transaction.id,
        meetingLocation: 'Address A',
        acceptedLocationLabel: 'Spot A',
      }),
    );
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      expect.any(Object),
      'chat.directTrade.locationAccepted',
    );
  });

  it('rejects location selection from a chat that is not the active deal', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.getActiveDealChatRoomId.mockResolvedValue(
      '99999999-9999-9999-9999-999999999999',
    );
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    const useCase = new AcceptDirectTradeLocationUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute({
        chatRoomId: ROOM_ID,
        userId: BUYER_ID,
        locationLabel: 'Spot A',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });

  it('rejects seller trying to choose the buyer meeting location', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    const useCase = new AcceptDirectTradeLocationUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute({
        chatRoomId: ROOM_ID,
        userId: SELLER_ID,
        locationLabel: 'Spot A',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });
});

describe(RequestDirectTradeLocationChangeUseCase.name, () => {
  it('rejects custom location requests before buyer has picked a listing spot', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });

    const useCase = new RequestDirectTradeLocationChangeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        meetingTime: '19:00',
        meetingLocation: 'New cafe',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });

  it('rejects custom location that duplicates an offered listing spot', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.784,
      meetingLongitude: 96.157,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });

    const useCase = new RequestDirectTradeLocationChangeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        meetingTime: '19:00',
        meetingLocation: 'Spot A',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });

  it('rejects seller trying to request buyer location change', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.784,
      meetingLongitude: 96.157,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    const useCase = new RequestDirectTradeLocationChangeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(SELLER_ID, ROOM_ID, {
        meetingTime: '19:00',
        meetingLocation: 'New cafe',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });
});

describe(RespondDirectTradeLocationChangeUseCase.name, () => {
  it('rejects seller response when no buyer location change is pending', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.784,
      meetingLongitude: 96.157,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    const useCase = new RespondDirectTradeLocationChangeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(SELLER_ID, ROOM_ID, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });

  it('rejects buyer trying to respond to their own location change request', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue(buildListingWithMeetingLocations());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '18:30',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.784,
      meetingLongitude: 96.157,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: 'New cafe',
      buyerRequestedLatitude: 16.8,
      buyerRequestedLongitude: 96.2,
    });
    const useCase = new RespondDirectTradeLocationChangeUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(chats.upsertDirectTrade).not.toHaveBeenCalled();
  });
});

describe(MarkChatRoomReadUseCase.name, () => {
  it('marks messages read for participant', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.markRoomMessagesRead.mockResolvedValue(3);

    const useCase = new MarkChatRoomReadUseCase(chats, buildUserRepoMock());
    const count = await useCase.execute(BUYER_ID, ROOM_ID);

    expect(count).toBe(3);
    expect(chats.markRoomMessagesRead).toHaveBeenCalledWith(ROOM_ID, BUYER_ID);
  });
});

describe(GetChatSafePaymentStatusUseCase.name, () => {
  it('includes buyer KBZ account when buyer requests status', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const room = buildChatRoom();
    const tx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
    });

    chats.findRoomById.mockResolvedValue(room);
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: tx,
      safePayment: {} as never,
      canSubmitPayment: false,
      buyerKbzAccount: null,
    });
    users.getAuthDataByUserId.mockResolvedValue({
      kbzPayAccount: {
        accountName: 'Buyer KBZ',
        phoneNumber: '09123456789',
        isVerified: true,
      },
    } as never);

    const useCase = new GetChatSafePaymentStatusUseCase(chats, users);
    const result = await useCase.execute(BUYER_ID, ROOM_ID);

    expect(result.buyerKbzAccount).toEqual({
      accountName: 'Buyer KBZ',
      phoneNumber: '09123456789',
      isVerified: true,
    });
  });
});

describe(RequestChatSafePaymentUseCase.name, () => {
  it('rejects when seller requests safe payment', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue({ price: 100_000, isDeleted: false } as never);

    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      products,
      buildPublisherMock(),
    );

    await expect(useCase.execute(SELLER_ID, ROOM_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(products.getActiveDealChatRoomId).not.toHaveBeenCalled();
    expect(chats.requestSafePayment).not.toHaveBeenCalled();
  });

  it('rejects safe payment when seller has not selected an active deal', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.getActiveDealChatRoomId.mockResolvedValue(null);
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      products,
      buildPublisherMock(),
    );

    await expect(useCase.execute(BUYER_ID, ROOM_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(products.findById).not.toHaveBeenCalled();
    expect(chats.requestSafePayment).not.toHaveBeenCalled();
  });

  it('rejects safe payment when another chat is the active deal', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.getActiveDealChatRoomId.mockResolvedValue(
      '99999999-9999-9999-9999-999999999999',
    );
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      products,
      buildPublisherMock(),
    );

    await expect(useCase.execute(BUYER_ID, ROOM_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(products.findById).not.toHaveBeenCalled();
    expect(chats.requestSafePayment).not.toHaveBeenCalled();
  });

  it('notifies admins when buyer requests safe payment', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const products = buildProductRepoMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const tx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
      amount: 100_000,
    });

    chats.findRoomById.mockResolvedValue(room);
    products.findById.mockResolvedValue({ price: 100_000, isDeleted: false } as never);
    chats.requestSafePayment.mockResolvedValue({
      transaction: tx,
      safePayment: {} as never,
    });
    chats.createMessage.mockResolvedValue(buildChatMessage());
    users.findAdminUserIds.mockResolvedValue(['admin-1']);
    users.createNotification.mockResolvedValue(undefined as never);

    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      users,
      products,
      publisher,
    );
    const result = await useCase.execute(BUYER_ID, ROOM_ID);

    expect(result).toBe(tx);
    expect(chats.requestSafePayment).toHaveBeenCalledWith(
      ROOM_ID,
      LISTING_ID,
      BUYER_ID,
      SELLER_ID,
      100_000,
    );
    expect(users.createNotification).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('returns existing transaction when request hits duplicate conflict', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const products = buildProductRepoMock();
    const room = buildChatRoom();
    const existingTx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
    });
    chats.findRoomById.mockResolvedValue(room);
    products.findById.mockResolvedValue({ price: 50_000, isDeleted: false } as never);
    chats.requestSafePayment.mockRejectedValue(new ConflictException());
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: existingTx,
      safePayment: {} as never,
      canSubmitPayment: false,
    });
    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      users,
      products,
      buildPublisherMock(),
    );

    const result = await useCase.execute(BUYER_ID, ROOM_ID);
    expect(result).toBe(existingTx);
    expect(chats.createMessage).not.toHaveBeenCalled();
    expect(users.createNotification).not.toHaveBeenCalled();
  });

  it('rethrows duplicate safe-payment conflict when no existing status can be found', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const products = buildProductRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    products.findById.mockResolvedValue({
      price: 50_000,
      isDeleted: false,
    } as never);
    chats.requestSafePayment.mockRejectedValue(new ConflictException());
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue(null);
    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      users,
      products,
      buildPublisherMock(),
    );

    await expect(useCase.execute(BUYER_ID, ROOM_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(chats.createMessage).not.toHaveBeenCalled();
    expect(users.createNotification).not.toHaveBeenCalled();
  });
});

describe(SubmitChatSafePaymentUseCase.name, () => {
  it('rejects when seller submits safe payment', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      buildIdempotencyMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(SELLER_ID, ROOM_ID, {
        payerKbzName: 'A',
        payerKbzPhone: '09',
        paymentAmount: 10,
        kbzTransactionId: 'KBZ1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('notifies admins and publishes on buyer submit', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const tx = buildTransaction({ amount: 100_000 });

    chats.findRoomById.mockResolvedValue(room);
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: tx,
      safePayment: {
        instructionSentAt: new Date(),
        adminReceivingPhone: '09111111111',
      } as never,
      canSubmitPayment: true,
    });
    chats.submitSafePayment.mockResolvedValue({} as never);
    chats.createMessage.mockResolvedValue(buildChatMessage());
    chats.findTransactionById.mockResolvedValue(tx);
    users.findAdminUserIds.mockResolvedValue(['admin-1']);
    users.createNotification.mockResolvedValue(undefined as never);

    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      users,
      buildIdempotencyMock(),
      publisher,
    );

    const result = await useCase.execute(BUYER_ID, ROOM_ID, {
      payerKbzName: 'Buyer',
      payerKbzPhone: '09123456789',
      paymentAmount: 100_000,
      kbzTransactionId: 'KBZ123',
    });

    expect(result).toBe(tx);
    expect(users.createNotification).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('rejects when admin instruction has not been sent', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: buildTransaction({
        status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
      }),
      safePayment: {} as never,
      canSubmitPayment: false,
    });
    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      buildIdempotencyMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        payerKbzName: 'Buyer',
        payerKbzPhone: '09111111111',
        paymentAmount: 500,
        kbzTransactionId: 'KBZX',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.submitSafePayment).not.toHaveBeenCalled();
  });

  it('rejects payment amount that does not match listing price on transaction', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: buildTransaction({ amount: 100_000 }),
      safePayment: { instructionSentAt: new Date() } as never,
      canSubmitPayment: true,
    });
    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      buildIdempotencyMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        payerKbzName: 'Buyer',
        payerKbzPhone: '09111111111',
        paymentAmount: 99_000,
        kbzTransactionId: 'KBZWRONG',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.submitSafePayment).not.toHaveBeenCalled();
  });

  it('blocks duplicate submit by idempotency key', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    idempotency.reserve.mockResolvedValue(false);
    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      idempotency,
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        payerKbzName: 'Buyer',
        payerKbzPhone: '09111111111',
        paymentAmount: 500,
        kbzTransactionId: 'KBZY',
        idempotencyKey: 'dup-safe-pay',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(chats.findSafePaymentStatusByChatRoom).not.toHaveBeenCalled();
    expect(chats.submitSafePayment).not.toHaveBeenCalled();
  });
});

describe(CompleteChatTransactionUseCase.name, () => {
  it('rejects when safe payment is not yet received by admin', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_PENDING,
      }),
    );
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chats.markTransactionCompletedByUser).not.toHaveBeenCalled();
  });

  it('rejects direct trade completion while safe payment is in progress', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_PENDING,
      }),
    );
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chats.markTransactionCompletedByUser).not.toHaveBeenCalled();
  });

  it('rejects direct trade completion when safe payment already completed', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(
      buildTransaction({
        id: 'safe-pay-tx-id',
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.COMPLETED,
      }),
    );
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows direct trade cash completion when meeting place is agreed', async () => {
    const chats = buildChatRepoMock();
    const publisher = buildPublisherMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(null);
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        id: TX_ID,
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.78,
      meetingLongitude: 96.15,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    const next = buildTransaction({
      type: TransactionType.DIRECT_TRADE,
      status: TransactionStatus.BUYER_COMPLETED,
      buyerCompleted: true,
      sellerCompleted: false,
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage.mockResolvedValue(buildChatMessage());
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), publisher);

    await useCase.execute(BUYER_ID, TX_ID);

    expect(chats.markTransactionCompletedByUser).toHaveBeenCalled();
    expect(chats.stopAllLocationSharesForChatRoom).not.toHaveBeenCalled();
  });

  it('rejects direct trade cash completion without agreed meeting place', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(null);
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        id: TX_ID,
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chats.markTransactionCompletedByUser).not.toHaveBeenCalled();
  });

  it('allows safe payment completion without meeting place when no direct trade (delivery)', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
      }),
    );
    chats.findTransactionForChat.mockResolvedValue(null);
    chats.markTransactionCompletedByUser.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.BUYER_COMPLETED,
        buyerCompleted: true,
        sellerCompleted: false,
      }),
    );
    chats.createMessage.mockResolvedValue(buildChatMessage());
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await useCase.execute(BUYER_ID, TX_ID);

    expect(chats.findDirectTradeByTransactionId).not.toHaveBeenCalled();
    expect(chats.markTransactionCompletedByUser).toHaveBeenCalled();
  });

  it('rejects completion when meeting location change is still pending', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
      }),
    );
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        id: 'direct-tx-id',
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: 'direct-tx-id',
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: 'Somewhere new',
      buyerRequestedLatitude: 16.78,
      buyerRequestedLongitude: 96.15,
    });
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chats.markTransactionCompletedByUser).not.toHaveBeenCalled();
  });

  it('rejects safe payment completion when direct trade started but no meeting place', async () => {
    const chats = buildChatRepoMock();
    const directTxId = 'direct-tx-id';
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
      }),
    );
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        id: directTxId,
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: directTxId,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: null,
      meetingLatitude: null,
      meetingLongitude: null,
      acceptedLocationLabel: null,
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chats.markTransactionCompletedByUser).not.toHaveBeenCalled();
  });

  it('allows safe payment completion when direct trade has agreed meeting place', async () => {
    const chats = buildChatRepoMock();
    const directTxId = 'direct-tx-id';
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
      }),
    );
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        id: directTxId,
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: directTxId,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.78,
      meetingLongitude: 96.15,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.BUYER_COMPLETED,
        buyerCompleted: true,
        sellerCompleted: false,
      }),
    );
    chats.createMessage.mockResolvedValue(buildChatMessage());
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await useCase.execute(BUYER_ID, TX_ID);

    expect(chats.markTransactionCompletedByUser).toHaveBeenCalled();
  });

  it('rejects when transaction does not exist', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(null);
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects when user is not part of transaction', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_RECEIVED }),
    );

    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), buildPublisherMock());

    await expect(
      useCase.execute('99999999-9999-9999-9999-999999999999', TX_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes partial completion event when only one side completes', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const publisher = buildPublisherMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_RECEIVED }),
    );
    const next = buildTransaction({
      status: TransactionStatus.BUYER_COMPLETED,
      buyerCompleted: true,
      sellerCompleted: false,
    });
    const msg = buildChatMessage({
      type: MessageType.TRANSACTION_COMPLETED,
      content:
        'Transaction marked completed by one side. Waiting for the other side.',
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage.mockResolvedValue(msg);
    const useCase = new CompleteChatTransactionUseCase(
      chats,
      products,
      buildUserRepoMock(),
      publisher,
    );

    const result = await useCase.execute(BUYER_ID, TX_ID);

    expect(result).toBe(next);
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      msg,
      'chat.transaction.completedByBuyer',
    );
    expect(products.markAsSold).not.toHaveBeenCalled();
  });

  it('returns existing transaction without duplicate message when user already completed', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const publisher = buildPublisherMock();
    const alreadyDone = buildTransaction({
      status: TransactionStatus.BUYER_COMPLETED,
      buyerCompleted: true,
      sellerCompleted: false,
    });
    chats.findTransactionById.mockResolvedValue(alreadyDone);
    const useCase = new CompleteChatTransactionUseCase(
      chats,
      products,
      buildUserRepoMock(),
      publisher,
    );

    const result = await useCase.execute(BUYER_ID, TX_ID);

    expect(result).toBe(alreadyDone);
    expect(chats.markTransactionCompletedByUser).not.toHaveBeenCalled();
    expect(chats.createMessage).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(products.markAsSold).not.toHaveBeenCalled();
  });

  it('stops completing user live location on first transaction complete', async () => {
    const chats = buildChatRepoMock();
    const publisher = buildPublisherMock();
    const directTxId = 'direct-tx-id';
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.SAFE_PAYMENT,
        status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
      }),
    );
    chats.findTransactionForChat.mockImplementation(
      async (_roomId, type) =>
        type === TransactionType.DIRECT_TRADE
          ? buildTransaction({
              id: directTxId,
              type: TransactionType.DIRECT_TRADE,
              status: TransactionStatus.INITIATED,
            })
          : null,
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: directTxId,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.78,
      meetingLongitude: 96.15,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    chats.findDirectTradeIdByTransactionId.mockResolvedValue('dt-1');
    const next = buildTransaction({
      type: TransactionType.SAFE_PAYMENT,
      status: TransactionStatus.BUYER_COMPLETED,
      buyerCompleted: true,
      sellerCompleted: false,
    });
    const completionMsg = buildChatMessage({
      type: MessageType.TRANSACTION_COMPLETED,
    });
    const locationMsg = buildChatMessage({
      type: MessageType.LOCATION_SHARING_STOPPED,
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage
      .mockResolvedValueOnce(completionMsg)
      .mockResolvedValueOnce(locationMsg);
    chats.stopLocationShare.mockResolvedValue(1);
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), publisher);

    await useCase.execute(BUYER_ID, TX_ID);

    expect(chats.stopLocationShare).toHaveBeenCalledWith('dt-1', BUYER_ID);
    expect(chats.stopAllLocationSharesForChatRoom).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      locationMsg,
      'chat.location.stopped',
    );
  });

  it('publishes final completion event when both sides completed', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const publisher = buildPublisherMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_RECEIVED }),
    );
    const next = buildTransaction({
      status: TransactionStatus.COMPLETED,
      buyerCompleted: true,
      sellerCompleted: true,
      completedAt: new Date('2026-06-10T10:00:00.000Z'),
    });
    const msg = buildChatMessage({
      type: MessageType.TRANSACTION_COMPLETED,
      content: 'Both sides marked transaction as completed.',
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage.mockResolvedValue(msg);
    chats.stopAllLocationSharesForChatRoom.mockResolvedValue(0);
    const useCase = new CompleteChatTransactionUseCase(
      chats,
      products,
      buildUserRepoMock(),
      publisher,
    );

    await useCase.execute(SELLER_ID, TX_ID);

    expect(chats.stopAllLocationSharesForChatRoom).toHaveBeenCalledWith(ROOM_ID);
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      msg,
      'chat.transaction.completed',
    );
    expect(products.markAsSold).toHaveBeenCalledWith(LISTING_ID);
  });

  it('stops location sharing for both parties when transaction becomes completed', async () => {
    const chats = buildChatRepoMock();
    const publisher = buildPublisherMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_RECEIVED }),
    );
    const next = buildTransaction({
      status: TransactionStatus.COMPLETED,
      buyerCompleted: true,
      sellerCompleted: true,
    });
    const completionMsg = buildChatMessage({
      type: MessageType.TRANSACTION_COMPLETED,
    });
    const locationMsg = buildChatMessage({
      type: MessageType.LOCATION_SHARING_STOPPED,
      content:
        'Location sharing stopped for both parties because the transaction was completed.',
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage
      .mockResolvedValueOnce(completionMsg)
      .mockResolvedValueOnce(locationMsg);
    chats.stopAllLocationSharesForChatRoom.mockResolvedValue(2);
    const useCase = new CompleteChatTransactionUseCase(chats, buildProductRepoMock(), buildUserRepoMock(), publisher);

    await useCase.execute(SELLER_ID, TX_ID);

    expect(chats.stopAllLocationSharesForChatRoom).toHaveBeenCalledWith(ROOM_ID);
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      locationMsg,
      'chat.location.stopped',
    );
  });

  it('marks listing sold when direct trade cash transaction fully completes', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.SELLER_COMPLETED,
        sellerCompleted: true,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(null);
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.SELLER_COMPLETED,
        sellerCompleted: true,
      }),
    );
    chats.findDirectTradeByTransactionId.mockResolvedValue({
      id: 'dt-1',
      transactionId: TX_ID,
      meetingDate: new Date('2026-06-01'),
      meetingTime: '15:00',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.78,
      meetingLongitude: 96.15,
      acceptedLocationLabel: 'Primary',
      buyerRequestedLocation: null,
      buyerRequestedLatitude: null,
      buyerRequestedLongitude: null,
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.COMPLETED,
        buyerCompleted: true,
        sellerCompleted: true,
      }),
    );
    chats.createMessage.mockResolvedValue(buildChatMessage());

    const useCase = new CompleteChatTransactionUseCase(
      chats,
      products,
      buildUserRepoMock(),
      buildPublisherMock(),
    );
    await useCase.execute(BUYER_ID, TX_ID);

    expect(products.markAsSold).toHaveBeenCalledWith(LISTING_ID);
  });
});

describe(StartChatLocationShareUseCase.name, () => {
  it('rejects when user already marked transaction complete', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.BUYER_COMPLETED,
        buyerCompleted: true,
        sellerCompleted: false,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(null);
    chats.findDirectTradeIdByTransactionId.mockResolvedValue('dt-1');
    const useCase = new StartChatLocationShareUseCase(
      chats,
      buildUserRepoMock(),
      buildRealtimeMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, 16.78, 96.15, 300),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.startLocationShare).not.toHaveBeenCalled();
  });

  it('updates an already-active location share without duplicate system message', async () => {
    const chats = buildChatRepoMock();
    const realtime = buildRealtimeMock();
    const publisher = buildPublisherMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.findTransactionForChat.mockResolvedValue(
      buildTransaction({
        type: TransactionType.DIRECT_TRADE,
        status: TransactionStatus.INITIATED,
      }),
    );
    chats.findBlockingSafePaymentForChat.mockResolvedValue(null);
    chats.findDirectTradeIdByTransactionId.mockResolvedValue('dt-1');
    chats.startLocationShare.mockResolvedValue({ alreadyActive: true });

    const useCase = new StartChatLocationShareUseCase(
      chats,
      buildUserRepoMock(),
      realtime,
      publisher,
    );
    const result = await useCase.execute(BUYER_ID, ROOM_ID, 16.78, 96.15, 300);

    expect(result.alreadyActive).toBe(true);
    expect(chats.createMessage).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(realtime.emitToChatRoom).toHaveBeenCalledWith(
      ROOM_ID,
      'chat.location.updated',
      expect.objectContaining({ userId: BUYER_ID }),
    );
  });
});

describe(AdminSendSafePaymentInstructionUseCase.name, () => {
  it('emits realtime payload and creates admin + buyer notifications', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const realtime = buildRealtimeMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    const tx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_INSTRUCTION_SENT,
    });
    chats.sendSafePaymentInstruction.mockResolvedValue({
      transaction: tx,
      safePayment: { instructionSentAt: new Date('2026-06-01T10:00:00.000Z') } as never,
    });
    users.createNotification.mockResolvedValue(undefined as never);
    const useCase = new AdminSendSafePaymentInstructionUseCase(
      chats,
      users,
      realtime,
    );

    await useCase.execute('admin-1', TX_ID, {
      adminReceivingPhone: '0911222333',
      adminNote: 'check amount',
    });

    expect(realtime.emitToChatRoom).toHaveBeenCalledWith(
      ROOM_ID,
      'chat.safePayment.instructionSent',
      expect.objectContaining({
        transactionId: TX_ID,
        chatRoomId: ROOM_ID,
        adminReceivingPhone: '0911222333',
        adminNote: 'check amount',
      }),
    );
    expect(users.createNotification).toHaveBeenCalledTimes(2);
  });
});

describe(AdminMarkSafePaymentReceivedUseCase.name, () => {
  it('notifies buyer, seller, and admin with role-specific metadata', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const realtime = buildRealtimeMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    const next = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
    });
    chats.markSafePaymentReceived.mockResolvedValue(next);
    users.createNotification.mockResolvedValue(undefined as never);
    const useCase = new AdminMarkSafePaymentReceivedUseCase(
      chats,
      users,
      realtime,
    );

    await useCase.execute('admin-1', TX_ID, {
      adminReceivingPhone: '099888777',
      adminNote: 'bank confirmed',
    });

    expect(realtime.emitToChatRoom).toHaveBeenCalledWith(
      ROOM_ID,
      'chat.safePayment.received',
      { transactionId: TX_ID, chatRoomId: ROOM_ID, status: next.status },
    );
    expect(users.createNotification).toHaveBeenCalledTimes(3);
    expect(users.createNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: BUYER_ID,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_CLIENT',
        metadata: expect.objectContaining({ role: 'buyer' }),
      }),
    );
    expect(users.createNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: SELLER_ID,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_CLIENT',
        metadata: expect.objectContaining({ role: 'seller' }),
      }),
    );
  });
});

describe(AdminMarkSafePaymentTransferredUseCase.name, () => {
  it('requires transaction completed by both parties', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_RECEIVED }),
    );

    const useCase = new AdminMarkSafePaymentTransferredUseCase(
      chats,
      users,
      buildRealtimeMock(),
    );

    await expect(
      useCase.execute('admin-1', TX_ID, { transferRef: 'REF1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when transaction id is unknown', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    chats.findTransactionById.mockResolvedValue(null);
    const useCase = new AdminMarkSafePaymentTransferredUseCase(
      chats,
      users,
      buildRealtimeMock(),
    );

    await expect(
      useCase.execute('admin-1', TX_ID, { transferRef: 'REF1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe(SubmitChatReviewAfterCompletionUseCase.name, () => {
  it('allows buyer review after buyer has completed (no need to wait seller)', async () => {
    const chats = buildChatRepoMock();
    const reviewUseCase = {
      execute: jest.fn(async () => ({ id: 'review-1' })),
    } as unknown as CreateTransactionReviewUseCase;

    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        status: TransactionStatus.BUYER_COMPLETED,
        buyerCompleted: true,
        sellerCompleted: false,
      }),
    );

    const useCase = new SubmitChatReviewAfterCompletionUseCase(
      chats,
      buildUserRepoMock(),
      reviewUseCase,
    );

    const dto = { stars: 5, comment: 'Great trade' };
    const result = await useCase.execute(BUYER_ID, TX_ID, dto);

    expect(result).toEqual({ id: 'review-1' });
    expect(reviewUseCase.execute).toHaveBeenCalledWith(TX_ID, BUYER_ID, dto);
  });

  it('rejects review if user has not completed yet', async () => {
    const chats = buildChatRepoMock();
    const reviewUseCase = {
      execute: jest.fn(),
    } as unknown as CreateTransactionReviewUseCase;
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        status: TransactionStatus.BUYER_COMPLETED,
        buyerCompleted: true,
        sellerCompleted: false,
      }),
    );

    const useCase = new SubmitChatReviewAfterCompletionUseCase(
      chats,
      buildUserRepoMock(),
      reviewUseCase,
    );

    await expect(
      useCase.execute(SELLER_ID, TX_ID, { stars: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reviewUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects review when transaction is missing', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(null);

    const useCase = new SubmitChatReviewAfterCompletionUseCase(
      chats,
      buildUserRepoMock(),
      { execute: jest.fn() } as unknown as CreateTransactionReviewUseCase,
    );

    await expect(
      useCase.execute(BUYER_ID, TX_ID, { stars: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects review when user is not transaction participant', async () => {
    const chats = buildChatRepoMock();
    const reviewUseCase = {
      execute: jest.fn(),
    } as unknown as CreateTransactionReviewUseCase;
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        status: TransactionStatus.COMPLETED,
        buyerCompleted: true,
        sellerCompleted: true,
      }),
    );

    const useCase = new SubmitChatReviewAfterCompletionUseCase(
      chats,
      buildUserRepoMock(),
      reviewUseCase,
    );

    await expect(
      useCase.execute('99999999-9999-9999-9999-999999999999', TX_ID, {
        stars: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reviewUseCase.execute).not.toHaveBeenCalled();
  });
});


