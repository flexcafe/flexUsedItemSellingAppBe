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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator.js';
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
import { GetTransactionStatsUseCase } from '../../../application/use-cases/points/get-transaction-stats.use-case.js';
import { GetPublicUserProfileUseCase } from '../../../application/use-cases/points/get-public-user-profile.use-case.js';
import { CreateTransactionReviewUseCase } from '../../../application/use-cases/points/create-transaction-review.use-case.js';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/points/request-withdrawal.use-case.js';
import { ListMyWithdrawalsUseCase } from '../../../application/use-cases/points/list-my-withdrawals.use-case.js';
import { ListClientRankConfigUseCase } from '../../../application/use-cases/points/list-client-rank-config.use-case.js';
import {
  CreateReviewDto,
  PointsSummaryDto,
  RankConfigResponseDto,
  PublicUserProfileDto,
  RequestWithdrawalDto,
  ReviewResponseDto,
  TransactionStatsDto,
  WithdrawalRequestDto,
} from '../../../application/dtos/points/index.js';
import {
  CLIENT_CREATE_REVIEW_DOC,
  CLIENT_POINTS_SUMMARY_DOC,
  CLIENT_RANK_CONFIG_DOC,
  CLIENT_PUBLIC_PROFILE_DOC,
  CLIENT_REQUEST_WITHDRAWAL_DOC,
  CLIENT_TRANSACTION_STATS_DOC,
  CLIENT_WITHDRAWAL_HISTORY_DOC,
} from './points-system.swagger.js';

@ApiTags('Client Points & Profile')
@Controller(ROUTE_PREFIX.client)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientPointsController {
  constructor(
    private readonly getPointsSummaryUseCase: GetPointsSummaryUseCase,
    private readonly getTransactionStatsUseCase: GetTransactionStatsUseCase,
    private readonly getPublicUserProfileUseCase: GetPublicUserProfileUseCase,
    private readonly createTransactionReviewUseCase: CreateTransactionReviewUseCase,
    private readonly requestWithdrawalUseCase: RequestWithdrawalUseCase,
    private readonly listMyWithdrawalsUseCase: ListMyWithdrawalsUseCase,
    private readonly listClientRankConfigUseCase: ListClientRankConfigUseCase,
  ) {}

  @Public()
  @Get('profile/rank-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List rank tiers and point thresholds (public)',
    description: CLIENT_RANK_CONFIG_DOC,
  })
  @ApiArraySuccessResponse(RankConfigResponseDto, {
    status: HttpStatus.OK,
    description: 'Rank configuration for displaying the points ladder',
  })
  async listRankConfig(): Promise<ApiResponseDto<RankConfigResponseDto[]>> {
    const rows = await this.listClientRankConfigUseCase.execute();
    return ApiResponseDto.success(rows, 'Rank configuration retrieved');
  }

  @Get('profile/points')
  @ApiOperation({
    summary: 'Get profile points and rank summary',
    description: CLIENT_POINTS_SUMMARY_DOC,
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

  @Get('profile/stats')
  @ApiOperation({
    summary: 'Get profile transaction stats',
    description: CLIENT_TRANSACTION_STATS_DOC,
  })
  @ApiSuccessResponse(TransactionStatsDto, {
    status: HttpStatus.OK,
    description: 'Profile transaction stats retrieved',
  })
  async getProfileStats(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<TransactionStatsDto>> {
    const stats = await this.getTransactionStatsUseCase.execute(user.sub);
    return ApiResponseDto.success(stats, 'Profile transaction stats retrieved');
  }

  @Get('users/:userId/public-profile')
  @ApiOperation({
    summary: 'Get public profile for another user',
    description: CLIENT_PUBLIC_PROFILE_DOC,
  })
  @ApiSuccessResponse(PublicUserProfileDto, {
    status: HttpStatus.OK,
    description: 'Public user profile retrieved',
  })
  async getPublicProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponseDto<PublicUserProfileDto>> {
    const profile = await this.getPublicUserProfileUseCase.execute(userId);
    return ApiResponseDto.success(profile, 'Public user profile retrieved');
  }

  @Post('profile/withdrawals')
  @Throttle({
    'admin-notify-ip': { limit: 40, ttl: 60_000 },
    'admin-notify-user': { limit: 15, ttl: 3_600_000 },
  })
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request point withdrawal',
    description: CLIENT_REQUEST_WITHDRAWAL_DOC,
  })
  @ApiSuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.CREATED,
    description: 'Withdrawal request created',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not enough available points or KBZPay is not verified',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (protects admin notification fan-out)',
  })
  async requestWithdrawal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestWithdrawalDto,
  ): Promise<ApiResponseDto<WithdrawalRequestDto>> {
    const request = await this.requestWithdrawalUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(request, 'Withdrawal request created');
  }

  @Get('profile/withdrawals')
  @ApiOperation({
    summary: 'List current user withdrawal requests',
    description: CLIENT_WITHDRAWAL_HISTORY_DOC,
  })
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
  @Throttle({
    'review-submit-ip': { limit: 60, ttl: 60_000 },
    'review-submit-user': { limit: 80, ttl: 3_600_000 },
  })
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Review buyer or seller after completed transaction',
    description: CLIENT_CREATE_REVIEW_DOC,
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
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded for review submissions',
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
