import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AwaitingSafePaymentInstructionResponseDto,
  ChatMessageResponseDto,
  ChatRoomResponseDto,
  ChatRoomSummaryResponseDto,
  PendingSafePaymentResponseDto,
  SafePaymentStatusResponseDto,
  StartLocationShareResponseDto,
  TransactionResponseDto,
} from './chat.dto.js';
import { ReviewResponseDto } from '../points/review.dto.js';

/** Concrete cursor page — Swagger cannot render generic `CursorPageResponseDto<T>`. */
export class ChatRoomSummaryCursorPageDto {
  @ApiProperty({ type: ChatRoomSummaryResponseDto, isArray: true })
  items: ChatRoomSummaryResponseDto[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Opaque cursor; pass as `?cursor=` on the next request',
  })
  nextCursor: string | null;
}

export class ChatMessageCursorPageDto {
  @ApiProperty({ type: ChatMessageResponseDto, isArray: true })
  items: ChatMessageResponseDto[];

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor: string | null;
}

export class PendingSafePaymentCursorPageDto {
  @ApiProperty({ type: PendingSafePaymentResponseDto, isArray: true })
  items: PendingSafePaymentResponseDto[];

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor: string | null;
}

export class AwaitingSafePaymentInstructionCursorPageDto {
  @ApiProperty({
    type: AwaitingSafePaymentInstructionResponseDto,
    isArray: true,
  })
  items: AwaitingSafePaymentInstructionResponseDto[];

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor: string | null;
}

export class ApiResponseChatRoomListDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Chat rooms retrieved' })
  message: string;

  @ApiProperty({ type: ChatRoomSummaryCursorPageDto })
  data: ChatRoomSummaryCursorPageDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-05-19T12:00:00.000Z' })
  timestamp: string;
}

export class ApiResponseChatMessageListDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Messages retrieved' })
  message: string;

  @ApiProperty({ type: ChatMessageCursorPageDto })
  data: ChatMessageCursorPageDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-05-19T12:00:00.000Z' })
  timestamp: string;
}

export class ApiResponseChatRoomDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Chat room ready' })
  message: string;

  @ApiProperty({ type: ChatRoomResponseDto })
  data: ChatRoomResponseDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseChatMessageDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Message sent' })
  message: string;

  @ApiProperty({ type: ChatMessageResponseDto })
  data: ChatMessageResponseDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseChatTransactionDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: TransactionResponseDto })
  data: TransactionResponseDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseSafePaymentStatusDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Safe payment status retrieved' })
  message: string;

  @ApiProperty({ type: SafePaymentStatusResponseDto })
  data: SafePaymentStatusResponseDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseStartLocationShareDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: StartLocationShareResponseDto })
  data: StartLocationShareResponseDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseChatBooleanDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: Boolean, example: true })
  data: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseChatNumberDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Messages marked as read' })
  message: string;

  @ApiProperty({ type: Number, example: 3 })
  data: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseChatReviewDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Review created' })
  message: string;

  @ApiProperty({ type: ReviewResponseDto })
  data: ReviewResponseDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponsePendingSafePaymentListDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Pending safe payments listed' })
  message: string;

  @ApiProperty({ type: PendingSafePaymentCursorPageDto })
  data: PendingSafePaymentCursorPageDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}

export class ApiResponseAwaitingInstructionListDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Awaiting instruction list retrieved' })
  message: string;

  @ApiProperty({ type: AwaitingSafePaymentInstructionCursorPageDto })
  data: AwaitingSafePaymentInstructionCursorPageDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;
}
