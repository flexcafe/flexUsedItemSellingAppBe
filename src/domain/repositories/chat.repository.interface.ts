import { MessageType } from '../enums/message-type.enum.js';
import { TransactionStatus } from '../enums/transaction-status.enum.js';
import { TransactionType } from '../enums/transaction-type.enum.js';
import type { JsonValue } from './user.repository.interface.js';

export interface ChatRoomData {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  meetingLocation?: string;
  meetingLatitude?: number;
  meetingLongitude?: number;
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

export interface SafePaymentStatusData {
  transaction: TransactionData;
  safePayment: SafePaymentData;
  canSubmitPayment: boolean;
}

export interface AwaitingSafePaymentInstructionData {
  transactionId: string;
  chatRoomId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
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
  getOrCreateRoom(data: CreateChatRoomData): Promise<ChatRoomData>;
  findRoomById(chatRoomId: string): Promise<ChatRoomData | null>;
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

  getOrCreateTransaction(
    chatRoomId: string,
    listingId: string,
    buyerId: string,
    sellerId: string,
    type: TransactionType,
    amount?: number,
  ): Promise<TransactionData>;
  findTransactionById(transactionId: string): Promise<TransactionData | null>;
  findTransactionForChat(
    chatRoomId: string,
    type: TransactionType,
  ): Promise<TransactionData | null>;
  findDirectTradeIdByTransactionId(
    transactionId: string,
  ): Promise<string | null>;
  upsertDirectTrade(data: DirectTradeData): Promise<void>;
  upsertLocationShare(data: LocationShareData): Promise<void>;
  stopLocationShare(directTradeId: string, userId: string): Promise<void>;
  requestSafePayment(
    chatRoomId: string,
    listingId: string,
    buyerId: string,
    sellerId: string,
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
