import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { GetPointsSummaryUseCase } from '../../../application/use-cases/points/get-points-summary.use-case.js';
import { CreateTransactionReviewUseCase } from '../../../application/use-cases/points/create-transaction-review.use-case.js';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/points/request-withdrawal.use-case.js';
import { ListMyWithdrawalsUseCase } from '../../../application/use-cases/points/list-my-withdrawals.use-case.js';
import {
  CreateReviewDto,
  PointsSummaryDto,
  RequestWithdrawalDto,
  ReviewResponseDto,
  WithdrawalRequestDto,
} from '../../../application/dtos/points/index.js';

@ApiTags('Client Points & Profile')
@Controller(ROUTE_PREFIX.client)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientPointsController {
  constructor(
    private readonly getPointsSummaryUseCase: GetPointsSummaryUseCase,
    private readonly createTransactionReviewUseCase: CreateTransactionReviewUseCase,
    private readonly requestWithdrawalUseCase: RequestWithdrawalUseCase,
    private readonly listMyWithdrawalsUseCase: ListMyWithdrawalsUseCase,
  ) {}

  @Get('profile/points')
  @ApiOperation({
    summary: 'Get profile points and rank summary',
    description:
      'Returns nickname, total points, available withdrawal points, current rank, current rank config, next rank config, and pending withdrawal amount for the profile section.',
  })
  @ApiSuccessResponse(PointsSummaryDto, {
    status: HttpStatus.OK,
    description: 'Profile points summary retrieved',
  })
  async getPointsSummary(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<PointsSummaryDto>> {
    const summary = await this.getPointsSummaryUseCase.execute(user.sub);
    return ApiResponseDto.success(summary, 'Profile points summary retrieved');
  }

  @Post('profile/withdrawals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request point withdrawal',
    description:
      'Client submits a point withdrawal amount from profile. KBZPay must already be verified. Admin later approves/rejects, then marks paid after manual KBZPay transfer.',
  })
  @ApiSuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.CREATED,
    description: 'Withdrawal request created',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not enough available points or KBZPay is not verified',
  })
  async requestWithdrawal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestWithdrawalDto,
  ): Promise<ApiResponseDto<WithdrawalRequestDto>> {
    const request = await this.requestWithdrawalUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(request, 'Withdrawal request created');
  }

  @Get('profile/withdrawals')
  @ApiOperation({ summary: 'List current user withdrawal requests' })
  @ApiArraySuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.OK,
    description: 'Withdrawal requests retrieved',
  })
  async listMyWithdrawals(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<WithdrawalRequestDto[]>> {
    const rows = await this.listMyWithdrawalsUseCase.execute(user.sub);
    return ApiResponseDto.success(rows, 'Withdrawal requests retrieved');
  }

  @Post('transactions/:transactionId/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Review buyer or seller after completed transaction',
    description:
      'Buyer and seller can each review the other side once after transaction status is COMPLETED. Stars must be 1-5 and points are awarded to the reviewed user using admin star-point config.',
  })
  @ApiSuccessResponse(ReviewResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Review submitted and points awarded',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transaction is not completed',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Current user already reviewed this transaction',
  })
  async createReview(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ApiResponseDto<ReviewResponseDto>> {
    const review = await this.createTransactionReviewUseCase.execute(
      transactionId,
      user.sub,
      dto,
    );
    return ApiResponseDto.success(review, 'Review submitted successfully');
  }
}
