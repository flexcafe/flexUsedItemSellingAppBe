import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import type {
  ChatMessageData,
  ChatRoomCounterpartySnapshot,
  ChatRoomData,
  ChatRoomListingSnapshot,
  ChatRoomSummaryData,
  PendingSafePaymentData,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { JsonValue } from '../../../domain/repositories/user.repository.interface.js';

export class CursorQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Opaque cursor from the previous page `nextCursor`',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    type: Number,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  take?: number;
}

export class OpenChatRoomDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty()
  @IsUUID()
  sellerId: string;
}

export class SendChatMessageDto {
  @ApiProperty({ minLength: 1 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 5000)
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({
    description: 'Client-provided idempotency key for retries',
  })
  @IsOptional()
  @IsString()
  @Length(8, 128)
  idempotencyKey?: string;
}

export class StartDirectTradeDto {
  @ApiProperty({ description: 'ISO date for in-person meeting (direct trade)' })
  @IsDateString()
  meetingDate: string;

  @ApiProperty({
    example: '15:30',
    description: 'Local meeting time label shown in chat',
  })
  @IsString()
  @Length(1, 20)
  meetingTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  meetingLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  meetingLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  meetingLongitude?: number;
}

export class LocationShareCoordinatesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ default: 120, minimum: 30, maximum: 1800 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(1800)
  expiresInSeconds = 120;
}

/** @deprecated Use LocationShareCoordinatesDto — kept as alias for existing imports */
export class UpdateLocationShareDto extends LocationShareCoordinatesDto {}

export class StartLocationShareResponseDto {
  @ApiProperty({
    description:
      'True when this user already had an active location share session',
  })
  alreadyActive: boolean;

  constructor(alreadyActive: boolean) {
    this.alreadyActive = alreadyActive;
  }
}

export class AdminSendSafePaymentInstructionDto {
  @ApiProperty({
    example: '09xxxxxxxxx',
    description: 'Admin KBZPay phone number buyer must transfer to',
  })
  @IsString()
  @Length(6, 30)
  adminReceivingPhone: string;

  @ApiPropertyOptional({
    description: 'Optional note shown to buyer in notification and chat',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  adminNote?: string;
}

export class AwaitingSafePaymentInstructionResponseDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  chatRoomId: string;

  @ApiProperty()
  listingId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  sellerId: string;

  @ApiProperty()
  createdAt: Date;

  constructor(data: {
    transactionId: string;
    chatRoomId: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    createdAt: Date;
  }) {
    this.transactionId = data.transactionId;
    this.chatRoomId = data.chatRoomId;
    this.listingId = data.listingId;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.createdAt = data.createdAt;
  }
}

export class SubmitSafePaymentDto {
  @ApiProperty({
    description:
      'Buyer KBZPay account holder name (pre-fill from GET .../safe-payment buyerKbzAccountName)',
  })
  @IsString()
  @Length(2, 120)
  payerKbzName: string;

  @ApiProperty({
    description:
      'Buyer KBZPay phone used for transfer (pre-fill from buyerKbzPhoneNumber)',
  })
  @IsString()
  @Length(6, 30)
  payerKbzPhone: string;

  @ApiProperty({ description: 'Payment amount in MMK transferred to admin' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  paymentAmount: number;

  @ApiProperty({
    description:
      'KBZPay transaction ID from buyer transfer to adminReceivingPhone',
  })
  @IsString()
  @Length(4, 80)
  kbzTransactionId: string;

  @ApiPropertyOptional({
    description: 'Client-provided idempotency key for retries',
  })
  @IsOptional()
  @IsString()
  @Length(8, 128)
  idempotencyKey?: string;
}

export class ConfirmTransactionCompleteDto {
  @ApiProperty({
    description:
      'Safe-payment or direct-trade transaction id. Buyer and seller each call once; status becomes COMPLETED when both have confirmed.',
  })
  @IsUUID()
  transactionId: string;
}

export class AdminMarkSafePaymentReceivedDto {
  @ApiPropertyOptional({
    example: '09xxxxxxxxx',
    description:
      'Optional when admin receiving phone was already sent in the transfer instruction step',
  })
  @IsOptional()
  @IsString()
  @Length(6, 30)
  adminReceivingPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  adminNote?: string;
}

export class AdminMarkSafePaymentTransferredDto {
  @ApiProperty({
    description:
      'Reference for seller payout (KBZ transfer id or internal ref). Required after both parties COMPLETED.',
  })
  @IsString()
  @Length(4, 80)
  transferRef: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  adminNote?: string;
}

export class ChatMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  chatRoomId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    example: { transactionId: 'uuid' },
    description: 'System message payload (varies by MessageType)',
  })
  metadata: JsonValue | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(data: ChatMessageData) {
    this.id = data.id;
    this.chatRoomId = data.chatRoomId;
    this.senderId = data.senderId;
    this.type = data.type;
    this.content = data.content;
    this.metadata = data.metadata;
    this.isRead = data.isRead;
    this.createdAt = data.createdAt;
  }
}

export class ChatRoomListingSnapshotDto {
  @ApiProperty({ description: 'Listing (product) id' })
  id: string;

  @ApiProperty({ example: 'iPhone 13 128GB' })
  title: string;

  @ApiProperty({ example: 450000 })
  price: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'First listing image URL',
  })
  imageUrl: string | null;

  constructor(data: ChatRoomListingSnapshot) {
    this.id = data.id;
    this.title = data.title;
    this.price = data.price;
    this.imageUrl = data.imageUrl;
  }
}

export class ChatRoomCounterpartySnapshotDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({
    description: 'Nickname of the other party (seller for buyer, buyer for seller)',
  })
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl: string | null;

  constructor(data: ChatRoomCounterpartySnapshot) {
    this.userId = data.userId;
    this.displayName = data.displayName;
    this.avatarUrl = data.avatarUrl;
  }
}

export class ChatRoomResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  listingId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  sellerId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: ChatRoomListingSnapshotDto })
  listing: ChatRoomListingSnapshotDto;

  @ApiProperty({
    type: ChatRoomCounterpartySnapshotDto,
    description: 'The other participant relative to the caller',
  })
  counterparty: ChatRoomCounterpartySnapshotDto;

  constructor(data: ChatRoomData) {
    this.id = data.id;
    this.listingId = data.listingId;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.listing = new ChatRoomListingSnapshotDto(data.listing);
    this.counterparty = new ChatRoomCounterpartySnapshotDto(data.counterparty);
  }
}

export class ChatRoomSummaryResponseDto {
  @ApiProperty()
  chatRoomId: string;

  @ApiProperty()
  listingId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  sellerId: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  latestMessageId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  latestMessageContent: string | null;

  @ApiPropertyOptional({ enum: MessageType, nullable: true, example: null })
  latestMessageType: MessageType | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  latestMessageCreatedAt: Date | null;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: ChatRoomListingSnapshotDto })
  listing: ChatRoomListingSnapshotDto;

  @ApiProperty({
    type: ChatRoomCounterpartySnapshotDto,
    description: 'The other participant relative to the current user',
  })
  counterparty: ChatRoomCounterpartySnapshotDto;

  constructor(data: ChatRoomSummaryData) {
    this.chatRoomId = data.chatRoomId;
    this.listingId = data.listingId;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.latestMessageId = data.latestMessageId;
    this.latestMessageContent = data.latestMessageContent;
    this.latestMessageType = data.latestMessageType;
    this.latestMessageCreatedAt = data.latestMessageCreatedAt;
    this.unreadCount = data.unreadCount;
    this.updatedAt = data.updatedAt;
    this.listing = new ChatRoomListingSnapshotDto(data.listing);
    this.counterparty = new ChatRoomCounterpartySnapshotDto(data.counterparty);
  }
}

export class CursorPageResponseDto<T> {
  @ApiProperty({
    description: 'Page items (see endpoint response schema for element type)',
    isArray: true,
  })
  items: T[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass as `cursor` query param to fetch the next page',
  })
  nextCursor: string | null;

  constructor(items: T[], nextCursor: string | null) {
    this.items = items;
    this.nextCursor = nextCursor;
  }
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  chatRoomId: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty({
    enum: TransactionStatus,
    description:
      'Safe payment: AWAITING_INSTRUCTION → INSTRUCTION_SENT → PENDING → RECEIVED → BUYER_COMPLETED/SELLER_COMPLETED → COMPLETED',
  })
  status: TransactionStatus;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  buyerCompleted: boolean;

  @ApiProperty()
  sellerCompleted: boolean;

  @ApiPropertyOptional()
  completedAt: Date | null;

  constructor(data: TransactionData) {
    this.id = data.id;
    this.chatRoomId = data.chatRoomId;
    this.type = data.type;
    this.status = data.status;
    this.amount = data.amount;
    this.buyerCompleted = data.buyerCompleted;
    this.sellerCompleted = data.sellerCompleted;
    this.completedAt = data.completedAt;
  }
}

export class SafePaymentStatusResponseDto {
  @ApiProperty({ type: () => TransactionResponseDto })
  transaction: TransactionResponseDto;

  @ApiPropertyOptional({ nullable: true })
  adminReceivingPhone: string | null;

  @ApiPropertyOptional({ nullable: true })
  instructionSentAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  instructionNote: string | null;

  @ApiProperty()
  canSubmitPayment: boolean;

  @ApiPropertyOptional({ nullable: true })
  payerKbzName: string | null;

  @ApiPropertyOptional({ nullable: true })
  payerKbzPhone: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentAmount: number | null;

  @ApiPropertyOptional({ nullable: true })
  kbzTransactionId: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Buyer KBZPay account for safe-payment modal pre-fill (only when caller is the buyer)',
  })
  buyerKbzAccountName: string | null;

  @ApiPropertyOptional({ nullable: true })
  buyerKbzPhoneNumber: string | null;

  @ApiPropertyOptional({ nullable: true })
  buyerKbzIsVerified: boolean | null;

  constructor(data: {
    transaction: TransactionData;
    safePayment: {
      adminReceivingPhone: string | null;
      instructionSentAt: Date | null;
      instructionNote: string | null;
      payerKbzName: string | null;
      payerKbzPhone: string | null;
      paymentAmount: number | null;
      kbzTransactionId: string | null;
    };
    canSubmitPayment: boolean;
    buyerKbzAccount: {
      accountName: string;
      phoneNumber: string;
      isVerified: boolean;
    } | null;
  }) {
    this.transaction = new TransactionResponseDto(data.transaction);
    this.adminReceivingPhone = data.safePayment.adminReceivingPhone;
    this.instructionSentAt = data.safePayment.instructionSentAt;
    this.instructionNote = data.safePayment.instructionNote;
    this.canSubmitPayment = data.canSubmitPayment;
    this.payerKbzName = data.safePayment.payerKbzName;
    this.payerKbzPhone = data.safePayment.payerKbzPhone;
    this.paymentAmount = data.safePayment.paymentAmount;
    this.kbzTransactionId = data.safePayment.kbzTransactionId;
    this.buyerKbzAccountName = data.buyerKbzAccount?.accountName ?? null;
    this.buyerKbzPhoneNumber = data.buyerKbzAccount?.phoneNumber ?? null;
    this.buyerKbzIsVerified = data.buyerKbzAccount?.isVerified ?? null;
  }
}

export class PendingSafePaymentResponseDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  chatRoomId: string;

  @ApiProperty()
  listingId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  sellerId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  payerKbzName: string;

  @ApiProperty()
  payerKbzPhone: string;

  @ApiProperty()
  kbzTransactionId: string;

  @ApiProperty()
  createdAt: Date;

  constructor(data: PendingSafePaymentData) {
    this.transactionId = data.transactionId;
    this.chatRoomId = data.chatRoomId;
    this.listingId = data.listingId;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.amount = data.amount;
    this.payerKbzName = data.payerKbzName;
    this.payerKbzPhone = data.payerKbzPhone;
    this.kbzTransactionId = data.kbzTransactionId;
    this.createdAt = data.createdAt;
  }
}
