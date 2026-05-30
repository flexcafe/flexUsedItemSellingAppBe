import { MessageType } from '../enums/message-type.enum.js';
import { TransactionStatus } from '../enums/transaction-status.enum.js';
import { TransactionType } from '../enums/transaction-type.enum.js';
import type { JsonValue } from './user.repository.interface.js';

/** Listing card for chat inbox / room header (avoids per-room product fetches). */
export interface ChatRoomListingSnapshot {
  id: string;
  title: string;
  price: number;
  imageUrl: string | null;
}

/** Other party in the room (buyer for seller, seller for buyer). */
export interface ChatRoomCounterpartySnapshot {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Minimal room row for auth checks (no listing/counterparty joins). */
export interface ChatRoomParticipantData {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
}

export interface ChatRoomData {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  listing: ChatRoomListingSnapshot;
  counterparty: ChatRoomCounterpartySnapshot;
}

export interface OpenChatRoomResult {
  room: ChatRoomData;
  wasCreated: boolean;
  shouldNotifySellerUnacceptedInterestThreshold: boolean;
  interestedBuyerCount: number | null;
}

export interface ChatRoomSummaryData {
  chatRoomId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  latestMessageId: string | null;
  latestMessageContent: string | null;
  latestMessageType: MessageType | null;
  latestMessageCreatedAt: Date | null;
  unreadCount: number;
  updatedAt: Date;
  listing: ChatRoomListingSnapshot;
  counterparty: ChatRoomCounterpartySnapshot;
}

export interface ChatMessageData {
  id: string;
  chatRoomId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata: JsonValue | null;
  isRead: boolean;
  createdAt: Date;
}

export interface ChatCursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CreateChatRoomData {
  listingId: string;
  buyerId: string;
  sellerId: string;
}

export interface CreateChatMessageData {
  chatRoomId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata?: JsonValue;
}

export interface DirectTradeData {
  transactionId: string;
  meetingDate: Date;
  meetingTime: string;
  meetingLocation?: string | null;
  meetingLatitude?: number | null;
  meetingLongitude?: number | null;
  /** Label from listing options the buyer chose (null until chosen) */
  acceptedLocationLabel?: string | null;
  /** When the buyer requests a new location */
  buyerRequestedLocation?: string | null;
  buyerRequestedLatitude?: number | null;
  buyerRequestedLongitude?: number | null;
}

export interface DirectTradeRecord {
  id: string;
  transactionId: string;
  meetingDate: Date;
  meetingTime: string;
  meetingLocation: string | null;
  meetingLatitude: number | null;
  meetingLongitude: number | null;
  acceptedLocationLabel: string | null;
  buyerRequestedLocation: string | null;
  buyerRequestedLatitude: number | null;
  buyerRequestedLongitude: number | null;
}

export interface LocationShareData {
  directTradeId: string;
  userId: string;
  latitude: number;
  longitude: number;
  expiresAt: Date;
}

export interface SafePaymentSubmissionData {
  transactionId: string;
  payerKbzName: string;
  payerKbzPhone: string;
  paymentAmount: number;
  kbzTransactionId: string;
}

export interface TransactionData {
  id: string;
  listingId: string;
  chatRoomId: string;
  buyerId: string;
  sellerId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  buyerCompleted: boolean;
  sellerCompleted: boolean;
  buyerCompletedAt: Date | null;
  sellerCompletedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafePaymentData {
  id: string;
  transactionId: string;
  adminReceivingPhone: string | null;
  instructionSentAt: Date | null;
  instructionSentById: string | null;
  instructionNote: string | null;
  payerKbzName: string | null;
  payerKbzPhone: string | null;
  paymentAmount: number | null;
  kbzTransactionId: string | null;
  isVerified: boolean;
  verifiedById: string | null;
  verifiedAt: Date | null;
  isTransferred: boolean;
  transferredAt: Date | null;
  transferRef: string | null;
}

export interface SafePaymentBuyerKbzAccountData {
  accountName: string;
  phoneNumber: string;
  isVerified: boolean;
}

export interface SafePaymentStatusData {
  transaction: TransactionData;
  safePayment: SafePaymentData;
  canSubmitPayment: boolean;
  /** Buyer KBZ account for safe-pay modal pre-fill (null for non-buyers or no account). */
  buyerKbzAccount: SafePaymentBuyerKbzAccountData | null;
}

export interface AwaitingSafePaymentInstructionData {
  transactionId: string;
  chatRoomId: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  createdAt: Date;
}

export interface PendingSafePaymentData {
  transactionId: string;
  chatRoomId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  payerKbzName: string;
  payerKbzPhone: string;
  kbzTransactionId: string;
  createdAt: Date;
}

export interface IChatRepository {
  getOrCreateRoom(
    data: CreateChatRoomData,
    viewerUserId: string,
  ): Promise<OpenChatRoomResult>;
  findRoomById(chatRoomId: string): Promise<ChatRoomParticipantData | null>;
  listRoomsForUser(
    userId: string,
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<ChatRoomSummaryData>>;
  listMessagesByRoom(
    chatRoomId: string,
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<ChatMessageData>>;
  createMessage(data: CreateChatMessageData): Promise<ChatMessageData>;
  markRoomMessagesRead(chatRoomId: string, userId: string): Promise<number>;

  /** Reuses latest non-terminal row of this type, or creates INITIATED. */
  getOrCreateTransaction(
    chatRoomId: string,
    listingId: string,
    buyerId: string,
    sellerId: string,
    type: TransactionType,
    amount?: number,
  ): Promise<TransactionData>;
  findTransactionById(transactionId: string): Promise<TransactionData | null>;
  /** Latest non-terminal transaction of this type for the room (excludes COMPLETED/CANCELLED/REFUNDED). */
  findTransactionForChat(
    chatRoomId: string,
    type: TransactionType,
  ): Promise<TransactionData | null>;
  /** Safe payment in this chat that is not cancelled/refunded (blocks direct-trade completion). */
  findBlockingSafePaymentForChat(
    chatRoomId: string,
  ): Promise<TransactionData | null>;
  findDirectTradeIdByTransactionId(
    transactionId: string,
  ): Promise<string | null>;
  findDirectTradeByTransactionId(
    transactionId: string,
  ): Promise<DirectTradeRecord | null>;
  /** Any non-terminal DIRECT_TRADE transaction on this listing (any chat room). */
  hasOpenDirectTradeForListing(listingId: string): Promise<boolean>;
  upsertDirectTrade(data: DirectTradeData): Promise<void>;
  startLocationShare(
    data: LocationShareData,
  ): Promise<{ alreadyActive: boolean }>;
  updateLocationShare(data: LocationShareData): Promise<void>;
  stopLocationShare(directTradeId: string, userId: string): Promise<number>;
  stopAllLocationSharesForChatRoom(chatRoomId: string): Promise<number>;
  requestSafePayment(
    chatRoomId: string,
    listingId: string,
    buyerId: string,
    sellerId: string,
    listingPrice: number,
  ): Promise<{ transaction: TransactionData; safePayment: SafePaymentData }>;
  sendSafePaymentInstruction(
    transactionId: string,
    adminId: string,
    adminReceivingPhone: string,
    adminNote?: string,
  ): Promise<{ transaction: TransactionData; safePayment: SafePaymentData }>;
  findSafePaymentStatusByChatRoom(
    chatRoomId: string,
  ): Promise<SafePaymentStatusData | null>;
  submitSafePayment(data: SafePaymentSubmissionData): Promise<SafePaymentData>;
  markSafePaymentReceived(
    transactionId: string,
    adminId: string,
    adminReceivingPhone?: string,
    adminNote?: string,
  ): Promise<TransactionData>;
  markSafePaymentTransferred(
    transactionId: string,
    adminId: string,
    transferRef: string,
    adminNote?: string,
  ): Promise<TransactionData>;
  markTransactionCompletedByUser(
    transactionId: string,
    userId: string,
  ): Promise<TransactionData>;
  markTransactionCancelledByUser(
    transactionId: string,
    userId: string,
  ): Promise<{ transaction: TransactionData; cancelledNow: boolean }>;
  listPendingSafePayments(
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<PendingSafePaymentData>>;
  listAwaitingSafePaymentInstructions(
    cursor: string | null,
    take: number,
  ): Promise<ChatCursorPage<AwaitingSafePaymentInstructionData>>;
}

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');
