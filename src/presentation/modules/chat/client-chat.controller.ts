import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ApiSuccessResponse } from '../../../common/decorators/api-response.decorator.js';
import {
  ChatMessageResponseDto,
  ChatRoomResponseDto,
  ChatRoomSummaryResponseDto,
  ConfirmTransactionCompleteDto,
  CursorPageResponseDto,
  CursorQueryDto,
  OpenChatRoomDto,
  SendChatMessageDto,
  StartDirectTradeDto,
  SubmitSafePaymentDto,
  TransactionResponseDto,
  UpdateLocationShareDto,
} from '../../../application/dtos/chat/chat.dto.js';
import { ChatService } from '../../../application/use-cases/chat/chat.service.js';
import { CreateReviewDto, ReviewResponseDto } from '../../../application/dtos/points/review.dto.js';

@ApiTags('Client Chat')
@Controller(`${ROUTE_PREFIX.client}/chats`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientChatController {
  constructor(private readonly chats: ChatService) {}

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Open or reuse chat room for buyer/seller/listing' })
  @ApiSuccessResponse(ChatRoomResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Chat room opened',
  })
  async openRoom(
    @CurrentUser() user: JwtPayload,
    @Body() dto: OpenChatRoomDto,
  ): Promise<ApiResponseDto<ChatRoomResponseDto>> {
    const room = await this.chats.openRoom(user.sub, dto);
    return ApiResponseDto.success(new ChatRoomResponseDto(room), 'Chat room ready');
  }

  @Get('rooms')
  @ApiOperation({ summary: 'List my chat rooms (cursor pagination)' })
  @ApiSuccessResponse(CursorPageResponseDto, {
    status: HttpStatus.OK,
    description: 'Chat rooms retrieved',
  })
  async listRooms(
    @CurrentUser() user: JwtPayload,
    @Query() query: CursorQueryDto,
  ): Promise<ApiResponseDto<CursorPageResponseDto<ChatRoomSummaryResponseDto>>> {
    const page = await this.chats.listRooms(
      user.sub,
      query.cursor ?? null,
      query.take,
    );
    return ApiResponseDto.success(
      new CursorPageResponseDto(
        page.items.map((i) => new ChatRoomSummaryResponseDto(i)),
        page.nextCursor,
      ),
      'Chat rooms retrieved',
    );
  }

  @Get(':chatRoomId/messages')
  @ApiOperation({ summary: 'List chat room messages (cursor pagination)' })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(CursorPageResponseDto, {
    status: HttpStatus.OK,
    description: 'Messages retrieved',
  })
  async listMessages(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Query() query: CursorQueryDto,
  ): Promise<ApiResponseDto<CursorPageResponseDto<ChatMessageResponseDto>>> {
    const page = await this.chats.listMessages(
      user.sub,
      chatRoomId,
      query.cursor ?? null,
      query.take,
    );
    return ApiResponseDto.success(
      new CursorPageResponseDto(
        page.items.map((i) => new ChatMessageResponseDto(i)),
        page.nextCursor,
      ),
      'Messages retrieved',
    );
  }

  @Post(':chatRoomId/messages')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'review-submit-user': { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Fallback HTTP send message endpoint' })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(ChatMessageResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Message sent',
  })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: SendChatMessageDto,
  ): Promise<ApiResponseDto<ChatMessageResponseDto>> {
    const message = await this.chats.sendMessage(
      user.sub,
      chatRoomId,
      dto.content,
      dto.type,
      dto.idempotencyKey,
    );
    return ApiResponseDto.success(
      new ChatMessageResponseDto(message),
      'Message sent',
    );
  }

  @Patch(':chatRoomId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark unread messages as read in room' })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(Number, {
    status: HttpStatus.OK,
    description: 'Messages marked as read',
  })
  async markRead(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
  ): Promise<ApiResponseDto<number>> {
    const count = await this.chats.markRead(user.sub, chatRoomId);
    return ApiResponseDto.success(count, 'Messages marked as read');
  }

  @Post(':chatRoomId/direct-trade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or update direct trade request' })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Direct trade updated',
  })
  async startDirectTrade(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: StartDirectTradeDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.chats.startDirectTrade(user.sub, chatRoomId, dto);
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Direct trade updated',
    );
  }

  @Post(':chatRoomId/location')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'review-submit-user': { limit: 240, ttl: 60_000 } })
  @ApiOperation({ summary: 'Update location sharing point in direct trade' })
  @ApiSuccessResponse(Boolean, {
    status: HttpStatus.OK,
    description: 'Location updated',
  })
  async updateLocation(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: UpdateLocationShareDto,
  ): Promise<ApiResponseDto<boolean>> {
    await this.chats.updateLocationShare(
      user.sub,
      chatRoomId,
      dto.latitude,
      dto.longitude,
      dto.expiresInSeconds,
    );
    return ApiResponseDto.success(true, 'Location updated');
  }

  @Post(':chatRoomId/location/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop location sharing in direct trade' })
  @ApiSuccessResponse(Boolean, {
    status: HttpStatus.OK,
    description: 'Location sharing stopped',
  })
  async stopLocation(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
  ): Promise<ApiResponseDto<boolean>> {
    await this.chats.stopLocationShare(user.sub, chatRoomId);
    return ApiResponseDto.success(true, 'Location sharing stopped');
  }

  @Post(':chatRoomId/safe-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit safe payment for chat transaction' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Safe payment submitted',
  })
  async submitSafePayment(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: SubmitSafePaymentDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.chats.submitSafePayment(user.sub, chatRoomId, dto);
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Safe payment submitted',
    );
  }

  @Post('transactions/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark transaction completed by buyer/seller (two-sided confirmation)',
  })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Transaction completion updated',
  })
  async completeTransaction(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmTransactionCompleteDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.chats.completeTransaction(user.sub, dto.transactionId);
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Transaction completion updated',
    );
  }

  @Post('transactions/:transactionId/reviews')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit review and trade satisfaction after completed transaction',
  })
  @ApiSuccessResponse(ReviewResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Review created',
  })
  async createReview(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId') transactionId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ApiResponseDto<ReviewResponseDto>> {
    const review = await this.chats.submitReviewAfterCompletion(
      user.sub,
      transactionId,
      dto,
    );
    return ApiResponseDto.success(review, 'Review created');
  }
}
