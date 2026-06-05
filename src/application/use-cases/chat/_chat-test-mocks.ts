import { jest } from '@jest/globals';
import type {
  ChatMessageData,
  ChatRoomData,
  IChatRepository,
  OpenChatRoomResult,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { IChatIdempotencyStore } from '../../../domain/services/chat-idempotency.interface.js';
import type { IChatMessagePublisher } from '../../../domain/services/chat-message-publisher.interface.js';
import type { IChatRealtime } from '../../../domain/services/chat-realtime.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';

export const ROOM_ID = '11111111-1111-1111-1111-111111111111';
export const BUYER_ID = '22222222-2222-2222-2222-222222222222';
export const SELLER_ID = '33333333-3333-3333-3333-333333333333';
export const LISTING_ID = '44444444-4444-4444-4444-444444444444';
export const TX_ID = '55555555-5555-5555-5555-555555555555';

const defaultListingSnapshot = {
  id: LISTING_ID,
  title: 'Test listing',
  price: 100_000,
  imageUrl: null as string | null,
};

const defaultCounterpartySnapshot = {
  userId: SELLER_ID,
  displayName: 'Test seller',
  avatarUrl: null as string | null,
};

export function buildChatRoom(
  overrides: Partial<ChatRoomData> = {},
): ChatRoomData {
  return {
    id: ROOM_ID,
    listingId: LISTING_ID,
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    listing: { ...defaultListingSnapshot, ...overrides.listing },
    counterparty: { ...defaultCounterpartySnapshot, ...overrides.counterparty },
    ...overrides,
  };
}

export function buildChatMessage(
  overrides: Partial<ChatMessageData> = {},
): ChatMessageData {
  return {
    id: '66666666-6666-6666-6666-666666666666',
    chatRoomId: ROOM_ID,
    senderId: BUYER_ID,
    type: MessageType.TEXT,
    content: 'hello',
    metadata: null,
    isRead: false,
    createdAt: new Date('2026-01-03'),
    ...overrides,
  };
}

export function buildTransaction(
  overrides: Partial<TransactionData> = {},
): TransactionData {
  return {
    id: TX_ID,
    listingId: LISTING_ID,
    chatRoomId: ROOM_ID,
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    type: TransactionType.SAFE_PAYMENT,
    status: TransactionStatus.SAFE_PAYMENT_PENDING,
    amount: 100,
    buyerCompleted: false,
    sellerCompleted: false,
    buyerCompletedAt: null,
    sellerCompletedAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

export function buildChatRepoMock(): jest.Mocked<IChatRepository> {
  return {
    getOrCreateRoom: jest.fn(),
    findRoomById: jest.fn(),
    listRoomsForUser: jest.fn(),
    listMessagesByRoom: jest.fn(),
    createMessage: jest.fn(),
    markRoomMessagesRead: jest.fn(),
    getOrCreateTransaction: jest.fn(),
    findTransactionById: jest.fn(),
    findTransactionForChat: jest.fn(),
    findBlockingSafePaymentForChat: jest.fn(() => Promise.resolve(null)),
    findDirectTradeIdByTransactionId: jest.fn(),
    findDirectTradeByTransactionId: jest.fn(),
    hasOpenDirectTradeForListing: jest.fn(() => Promise.resolve(false)),
    upsertDirectTrade: jest.fn(),
    startLocationShare: jest.fn(() =>
      Promise.resolve({ alreadyActive: false }),
    ),
    updateLocationShare: jest.fn(),
    stopLocationShare: jest.fn(() => Promise.resolve(0)),
    stopAllLocationSharesForChatRoom: jest.fn(() => Promise.resolve(0)),
    requestSafePayment: jest.fn(),
    sendSafePaymentInstruction: jest.fn(),
    findSafePaymentStatusByChatRoom: jest.fn(),
    submitSafePayment: jest.fn(),
    markSafePaymentReceived: jest.fn(),
    markSafePaymentTransferred: jest.fn(),
    markTransactionCompletedByUser: jest.fn(),
    markTransactionCancelledByUser: jest.fn(),
    listPendingSafePayments: jest.fn(),
    listAwaitingSafePaymentInstructions: jest.fn(),
  };
}

export function buildProductRepoMock(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForSeller: jest.fn(),
    getActiveDealChatRoomId: jest.fn(() => Promise.resolve(ROOM_ID)),
    setActiveDealChatRoomId: jest.fn(),
    findBySeller: jest.fn(),
    updateBySeller: jest.fn(),
    markAsSold: jest.fn(),
    softDeleteBySeller: jest.fn(),
    search: jest.fn(),
  };
}

export function buildOpenChatRoomResult(
  overrides: Partial<OpenChatRoomResult> = {},
): OpenChatRoomResult {
  return {
    room: buildChatRoom(),
    wasCreated: false,
    shouldNotifySellerUnacceptedInterestThreshold: false,
    interestedBuyerCount: null,
    ...overrides,
  };
}

export function buildActiveUserMock(
  overrides: { id?: string; active?: boolean } = {},
): { id: string; isActiveUser: () => boolean; isAdmin: () => boolean } {
  const active = overrides.active ?? true;
  return {
    id: overrides.id ?? BUYER_ID,
    isActiveUser: () => active,
    isAdmin: () => false,
  };
}

export function buildUserRepoMock(): jest.Mocked<IUserRepository> {
  const mock = {
    findById: jest.fn(() => Promise.resolve(buildActiveUserMock() as never)),
    getAdminRoleByUserId: jest.fn(() =>
      Promise.resolve({
        id: 'role-1',
        name: 'SAFE_PAYMENT_ADMIN',
        isSystem: false,
        permissions: [AdminPermission.MANAGE_SAFE_PAYMENTS],
      }),
    ),
    findAdminUserIds: jest.fn(),
    createNotification: jest.fn(),
    getAuthDataByUserId: jest.fn(),
  };
  return mock as unknown as jest.Mocked<IUserRepository>;
}

export function buildIdempotencyMock(): jest.Mocked<IChatIdempotencyStore> {
  return {
    reserve: jest.fn(() => Promise.resolve(true)),
    allowRateLimitedAction: jest.fn(() => Promise.resolve(true)),
  };
}

export function buildPublisherMock(): jest.Mocked<IChatMessagePublisher> {
  return {
    publish: jest.fn(),
  };
}

export function buildRealtimeMock(): jest.Mocked<IChatRealtime> {
  return {
    emitToChatRoom: jest.fn(),
    emitToUser: jest.fn(),
  };
}
