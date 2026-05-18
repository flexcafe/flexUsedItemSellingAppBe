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
  ChatRoomData,
  ChatRoomSummaryData,
  PendingSafePaymentData,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import type { JsonValue } from '../../../domain/repositories/user.repository.interface.js';

export class CursorQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  take = 20;
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
  @ApiProperty()
  @IsDateString()
  meetingDate: string;

  @ApiProperty({ example: '15:30' })
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

export class UpdateLocationShareDto {
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

export class AdminSendSafePaymentInstructionDto {
  @ApiProperty({ example: '09xxxxxxxxx' })
  @IsString()
  @Length(6, 30)
  adminReceivingPhone: string;

  @ApiPropertyOptional()
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
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  payerKbzName: string;

  @ApiProperty()
  @IsString()
  @Length(6, 30)
  payerKbzPhone: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  paymentAmount: number;

  @ApiProperty()
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
  @ApiProperty()
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
  @ApiProperty()
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

  @ApiPropertyOptional()
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

  constructor(data: ChatRoomData) {
    this.id = data.id;
    this.listingId = data.listingId;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
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

  @ApiPropertyOptional()
  latestMessageId: string | null;

  @ApiPropertyOptional()
  latestMessageContent: string | null;

  @ApiPropertyOptional({ enum: MessageType, nullable: true })
  latestMessageType: MessageType | null;

  @ApiPropertyOptional({ nullable: true })
  latestMessageCreatedAt: Date | null;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  updatedAt: Date;

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
  }
}

export class CursorPageResponseDto<T> {
  @ApiProperty()
  items: T[];

  @ApiPropertyOptional()
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

  @ApiProperty({ enum: TransactionStatus })
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
  @ApiProperty({ type: TransactionResponseDto })
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
