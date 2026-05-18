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
  CursorPageResponseDto,
  CursorQueryDto,
  PendingSafePaymentResponseDto,
  TransactionResponseDto,
} from '../../../application/dtos/chat/chat.dto.js';
import { ListPendingSafePaymentsUseCase } from '../../../application/use-cases/chat/list-pending-safe-payments.use-case.js';
import { AdminMarkSafePaymentReceivedUseCase } from '../../../application/use-cases/chat/admin-mark-safe-payment-received.use-case.js';
import { AdminMarkSafePaymentTransferredUseCase } from '../../../application/use-cases/chat/admin-mark-safe-payment-transferred.use-case.js';

@ApiTags('Admin Chat')
@Controller(`${ROUTE_PREFIX.adminDashboard}/chats`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminChatController {
  constructor(
    private readonly listPendingSafePayments: ListPendingSafePaymentsUseCase,
    private readonly adminMarkSafePaymentReceived: AdminMarkSafePaymentReceivedUseCase,
    private readonly adminMarkSafePaymentTransferred: AdminMarkSafePaymentTransferredUseCase,
  ) {}

  @Get('safe-payments/pending')
  @ApiOperation({ summary: 'List pending safe payment submissions for admin' })
  @ApiSuccessResponse(CursorPageResponseDto, {
    status: HttpStatus.OK,
    description: 'Pending safe payments listed',
  })
  async listPendingSafePaymentsHandler(
    @Query() query: CursorQueryDto,
  ): Promise<ApiResponseDto<CursorPageResponseDto<PendingSafePaymentResponseDto>>> {
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
