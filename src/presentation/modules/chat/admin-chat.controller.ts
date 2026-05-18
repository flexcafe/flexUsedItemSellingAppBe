import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type JwtPayload,
} from '../../../common/decorators/current-user.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ApiSuccessResponse } from '../../../common/decorators/api-response.decorator.js';
import {
  AdminMarkSafePaymentReceivedDto,
  AdminMarkSafePaymentTransferredDto,
  AdminSendSafePaymentInstructionDto,
  AwaitingSafePaymentInstructionResponseDto,
  CursorPageResponseDto,
  CursorQueryDto,
  PendingSafePaymentResponseDto,
  TransactionResponseDto,
} from '../../../application/dtos/chat/chat.dto.js';
import { ListPendingSafePaymentsUseCase } from '../../../application/use-cases/chat/list-pending-safe-payments.use-case.js';
import { ListAwaitingSafePaymentInstructionsUseCase } from '../../../application/use-cases/chat/list-awaiting-safe-payment-instructions.use-case.js';
import { AdminSendSafePaymentInstructionUseCase } from '../../../application/use-cases/chat/admin-send-safe-payment-instruction.use-case.js';
import { AdminMarkSafePaymentReceivedUseCase } from '../../../application/use-cases/chat/admin-mark-safe-payment-received.use-case.js';
import { AdminMarkSafePaymentTransferredUseCase } from '../../../application/use-cases/chat/admin-mark-safe-payment-transferred.use-case.js';

@ApiTags('Admin Chat')
@Controller(`${ROUTE_PREFIX.adminDashboard}/chats`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminChatController {
  constructor(
    private readonly listPendingSafePayments: ListPendingSafePaymentsUseCase,
    private readonly listAwaitingSafePaymentInstructions: ListAwaitingSafePaymentInstructionsUseCase,
    private readonly adminSendSafePaymentInstruction: AdminSendSafePaymentInstructionUseCase,
    private readonly adminMarkSafePaymentReceived: AdminMarkSafePaymentReceivedUseCase,
    private readonly adminMarkSafePaymentTransferred: AdminMarkSafePaymentTransferredUseCase,
  ) {}

  @Get('safe-payments/awaiting-instruction')
  @ApiOperation({
    summary: 'List safe payments waiting for admin KBZ receiving number',
  })
  @ApiSuccessResponse(CursorPageResponseDto, {
    status: HttpStatus.OK,
    description: 'Awaiting instruction list retrieved',
  })
  async listAwaitingInstruction(
    @Query() query: CursorQueryDto,
  ): Promise<
    ApiResponseDto<
      CursorPageResponseDto<AwaitingSafePaymentInstructionResponseDto>
    >
  > {
    const page = await this.listAwaitingSafePaymentInstructions.execute(
      query.cursor ?? null,
      query.take,
    );
    return ApiResponseDto.success(
      new CursorPageResponseDto(
        page.items.map((i) => new AwaitingSafePaymentInstructionResponseDto(i)),
        page.nextCursor,
      ),
      'Awaiting instruction list retrieved',
    );
  }

  @Post('safe-payments/:transactionId/send-instruction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send KBZPay receiving number to buyer (like KBZ verification)',
  })
  @ApiParam({ name: 'transactionId' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Transfer instruction sent to buyer',
  })
  async sendInstruction(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId') transactionId: string,
    @Body() dto: AdminSendSafePaymentInstructionDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.adminSendSafePaymentInstruction.execute(
      user.sub,
      transactionId,
      dto,
    );
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Transfer instruction sent to buyer',
    );
  }

  @Get('safe-payments/pending')
  @ApiOperation({ summary: 'List pending safe payment submissions for admin' })
  @ApiSuccessResponse(CursorPageResponseDto, {
    status: HttpStatus.OK,
    description: 'Pending safe payments listed',
  })
  async listPendingSafePaymentsHandler(
    @Query() query: CursorQueryDto,
  ): Promise<
    ApiResponseDto<CursorPageResponseDto<PendingSafePaymentResponseDto>>
  > {
    const page = await this.listPendingSafePayments.execute(
      query.cursor ?? null,
      query.take,
    );
    return ApiResponseDto.success(
      new CursorPageResponseDto(
        page.items.map((i) => new PendingSafePaymentResponseDto(i)),
        page.nextCursor,
      ),
      'Pending safe payments listed',
    );
  }

  @Post('safe-payments/:transactionId/received')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark safe payment as received by admin' })
  @ApiParam({ name: 'transactionId' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Safe payment marked as received',
  })
  async markReceived(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId') transactionId: string,
    @Body() dto: AdminMarkSafePaymentReceivedDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.adminMarkSafePaymentReceived.execute(
      user.sub,
      transactionId,
      dto,
    );
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Safe payment marked as received',
    );
  }

  @Post('safe-payments/:transactionId/transferred')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark safe payment as transferred to seller' })
  @ApiParam({ name: 'transactionId' })
  @ApiSuccessResponse(TransactionResponseDto, {
    status: HttpStatus.OK,
    description: 'Safe payment marked as transferred',
  })
  async markTransferred(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId') transactionId: string,
    @Body() dto: AdminMarkSafePaymentTransferredDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const tx = await this.adminMarkSafePaymentTransferred.execute(
      user.sub,
      transactionId,
      dto,
    );
    return ApiResponseDto.success(
      new TransactionResponseDto(tx),
      'Safe payment marked as transferred',
    );
  }
}
