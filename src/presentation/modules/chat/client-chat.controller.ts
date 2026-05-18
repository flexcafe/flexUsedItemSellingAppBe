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
  SafePaymentStatusResponseDto,
  SubmitSafePaymentDto,
  TransactionResponseDto,
  UpdateLocationShareDto,
} from '../../../application/dtos/chat/chat.dto.js';
import { CreateReviewDto, ReviewResponseDto } from '../../../application/dtos/points/review.dto.js';
import { OpenChatRoomUseCase } from '../../../application/use-cases/chat/open-chat-room.use-case.js';
import { ListChatRoomsUseCase } from '../../../application/use-cases/chat/list-chat-rooms.use-case.js';
import { ListChatMessagesUseCase } from '../../../application/use-cases/chat/list-chat-messages.use-case.js';
import { SendChatMessageUseCase } from '../../../application/use-cases/chat/send-chat-message.use-case.js';
import { MarkChatRoomReadUseCase } from '../../../application/use-cases/chat/mark-chat-room-read.use-case.js';
import { StartDirectTradeUseCase } from '../../../application/use-cases/chat/start-direct-trade.use-case.js';
import { UpdateChatLocationShareUseCase } from '../../../application/use-cases/chat/update-chat-location-share.use-case.js';
import { StopChatLocationShareUseCase } from '../../../application/use-cases/chat/stop-chat-location-share.use-case.js';
import { RequestChatSafePaymentUseCase } from '../../../application/use-cases/chat/request-chat-safe-payment.use-case.js';
import { GetChatSafePaymentStatusUseCase } from '../../../application/use-cases/chat/get-chat-safe-payment-status.use-case.js';
import { SubmitChatSafePaymentUseCase } from '../../../application/use-cases/chat/submit-chat-safe-payment.use-case.js';
import { CompleteChatTransactionUseCase } from '../../../application/use-cases/chat/complete-chat-transaction.use-case.js';
import { SubmitChatReviewAfterCompletionUseCase } from '../../../application/use-cases/chat/submit-chat-review-after-completion.use-case.js';

@ApiTags('Client Chat')
@Controller(`${ROUTE_PREFIX.client}/chats`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientChatController {
  constructor(
    private readonly openChatRoom: OpenChatRoomUseCase,
    private readonly listChatRooms: ListChatRoomsUseCase,
    private readonly listChatMessages: ListChatMessagesUseCase,
    private readonly sendChatMessage: SendChatMessageUseCase,
    private readonly markChatRoomRead: MarkChatRoomReadUseCase,
    private readonly startDirectTrade: StartDirectTradeUseCase,
    private readonly updateChatLocationShare: UpdateChatLocationShareUseCase,
    private readonly stopChatLocationShare: StopChatLocationShareUseCase,
    private readonly requestChatSafePayment: RequestChatSafePaymentUseCase,
    private readonly getChatSafePaymentStatus: GetChatSafePaymentStatusUseCase,
    private readonly submitChatSafePayment: SubmitChatSafePaymentUseCase,
    private readonly completeChatTransaction: CompleteChatTransactionUseCase,
    private readonly submitChatReviewAfterCompletion: SubmitChatReviewAfterCompletionUseCase,
  ) {}

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
    const room = await this.openChatRoom.execute(user.sub, dto);
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
    const page = await this.listChatRooms.execute(
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
    const page = await this.listChatMessages.execute(
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
    const message = await this.sendChatMessage.execute(
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
    const count = await this.markChatRoomRead.execute(user.sub, chatRoomId);
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
  async startDirectTradeHandler(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: StartDirectTradeDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.startDirectTrade.execute(user.sub, chatRoomId, dto);
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
    await this.updateChatLocationShare.execute(
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
    await this.stopChatLocationShare.execute(user.sub, chatRoomId);
    return ApiResponseDto.success(true, 'Location sharing stopped');
  }

  @Post(':chatRoomId/safe-payment/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buyer requests safe payment (notifies admin to send KBZ number)',
  })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Safe payment requested',
  })
  async requestSafePayment(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.requestChatSafePayment.execute(user.sub, chatRoomId);
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Safe payment requested',
    );
  }

  @Get(':chatRoomId/safe-payment')
  @ApiOperation({
    summary: 'Get safe payment status and admin transfer instruction for buyer',
  })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(SafePaymentStatusResponseDto, {
    status: HttpStatus.OK,
    description: 'Safe payment status retrieved',
  })
  async getSafePaymentStatus(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
  ): Promise<ApiResponseDto<SafePaymentStatusResponseDto>> {
    const status = await this.getChatSafePaymentStatus.execute(
      user.sub,
      chatRoomId,
    );
    return ApiResponseDto.success(
      new SafePaymentStatusResponseDto(status),
      'Safe payment status retrieved',
    );
  }

  @Post(':chatRoomId/safe-payment/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Buyer submits KBZ transaction ID after paying to admin receiving number',
  })
  @ApiParam({ name: 'chatRoomId' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Safe payment submitted',
  })
  async submitSafePayment(
    @CurrentUser() user: JwtPayload,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: SubmitSafePaymentDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.submitChatSafePayment.execute(user.sub, chatRoomId, dto);
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
    const tx = await this.completeChatTransaction.execute(
      user.sub,
      dto.transactionId,
    );
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
    const review = await this.submitChatReviewAfterCompletion.execute(
      user.sub,
      transactionId,
      dto,
    );
    return ApiResponseDto.success(review, 'Review created');
  }
}
