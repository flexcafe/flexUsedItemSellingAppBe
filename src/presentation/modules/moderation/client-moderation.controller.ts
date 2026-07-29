import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiErrorResponse,
  ApiStringArraySuccessResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import {
  BlockUserDto,
  ContentReportDto,
  SubmitContentReportDto,
  UnblockUserResultDto,
  UserBlockDto,
} from '../../../application/dtos/moderation/index.js';
import {
  BlockUserUseCase,
  ListBlockedUserIdsUseCase,
  ListBlockedUsersUseCase,
  ListMyContentReportsUseCase,
  SubmitContentReportUseCase,
  UnblockUserUseCase,
} from '../../../application/use-cases/moderation/index.js';

/** Without SkipThrottle, every named throttler applies (incl. auth-id / admin-notify). */
const SKIP_AUTH_REVIEW_CATALOG = {
  'auth-ip': true,
  'auth-id': true,
  'review-submit-ip': true,
  'review-submit-user': true,
  'catalog-search-ip': true,
  'catalog-detail-ip': true,
};

const SKIP_NOTIFY_AND_AUTH = {
  ...SKIP_AUTH_REVIEW_CATALOG,
  'admin-notify-ip': true,
  'admin-notify-user': true,
};

@ApiTags('Client Moderation')
@Controller(`${ROUTE_PREFIX.client}/moderation`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientModerationController {
  constructor(
    private readonly submitContentReport: SubmitContentReportUseCase,
    private readonly listMyContentReports: ListMyContentReportsUseCase,
    private readonly blockUser: BlockUserUseCase,
    private readonly unblockUser: UnblockUserUseCase,
    private readonly listBlockedUsers: ListBlockedUsersUseCase,
    private readonly listBlockedUserIds: ListBlockedUserIdsUseCase,
  ) {}

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @SkipThrottle(SKIP_AUTH_REVIEW_CATALOG)
  @Throttle({
    'admin-notify-ip': { limit: 40, ttl: 60_000 },
    'admin-notify-user': { limit: 20, ttl: 3_600_000 },
  })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Flag objectionable content',
    description:
      'Report a listing, chat message, review, or user profile (App Store Guideline 1.2). ' +
      'Notifies admins for review within 24 hours. Distinct from fraud reports ' +
      '(`POST /client/fraud-reports`), which target scam/fraud via referral code.',
  })
  @ApiSuccessResponse(ContentReportDto, {
    status: HttpStatus.CREATED,
    description: 'Content report submitted',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot report own content, cannot report an admin, or validation failure',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reported content or user not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Report rate limit exceeded',
  })
  async report(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitContentReportDto,
  ): Promise<ApiResponseDto<ContentReportDto>> {
    const row = await this.submitContentReport.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Content report submitted');
  }

  @Get('reports/mine')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(SKIP_NOTIFY_AND_AUTH)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'List my content reports',
    description: 'Returns content reports submitted by the authenticated user.',
  })
  @ApiArraySuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content reports retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  async myReports(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<ContentReportDto[]>> {
    const rows = await this.listMyContentReports.execute(user.sub);
    return ApiResponseDto.success(rows, 'Content reports retrieved');
  }

  @Post('blocks')
  @HttpCode(HttpStatus.CREATED)
  @SkipThrottle(SKIP_AUTH_REVIEW_CATALOG)
  @Throttle({
    'admin-notify-ip': { limit: 40, ttl: 60_000 },
    'admin-notify-user': { limit: 30, ttl: 3_600_000 },
  })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Block an abusive user',
    description:
      'Instantly excludes the blocked user from your product feed and chat ' +
      '(when requests include JWT). Also notifies the developer/admin team. ' +
      'Refresh the feed after blocking; optionally call `GET .../blocks/ids` for client-side filtering.',
  })
  @ApiSuccessResponse(UserBlockDto, {
    status: HttpStatus.CREATED,
    description: 'User blocked',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot block yourself or an admin account',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'User is already blocked',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Block rate limit exceeded',
  })
  async block(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BlockUserDto,
  ): Promise<ApiResponseDto<UserBlockDto>> {
    const row = await this.blockUser.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'User blocked');
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(SKIP_NOTIFY_AND_AUTH)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Unblock a user',
    description: 'Removes a previous block so the user can appear in feed/chat again.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Previously blocked user ID',
    example: '44444444-4444-4444-8444-444444444444',
  })
  @ApiSuccessResponse(UnblockUserResultDto, {
    status: HttpStatus.OK,
    description: 'User unblocked',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block not found',
  })
  async unblock(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponseDto<UnblockUserResultDto>> {
    const row = await this.unblockUser.execute(user.sub, userId);
    return ApiResponseDto.success(row, 'User unblocked');
  }

  @Get('blocks')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(SKIP_NOTIFY_AND_AUTH)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'List users I blocked',
    description: 'Full block list with nickname and referral code for settings UI.',
  })
  @ApiArraySuccessResponse(UserBlockDto, {
    status: HttpStatus.OK,
    description: 'Blocked users retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  async listBlocks(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<UserBlockDto[]>> {
    const rows = await this.listBlockedUsers.execute(user.sub);
    return ApiResponseDto.success(rows, 'Blocked users retrieved');
  }

  @Get('blocks/ids')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(SKIP_NOTIFY_AND_AUTH)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'IDs to hide from feed instantly after blocking',
    description:
      'Includes users you blocked and users who blocked you. ' +
      'Catalog already excludes blocked sellers when JWT is sent; use this list for extra client-side filtering.',
  })
  @ApiStringArraySuccessResponse({
    status: HttpStatus.OK,
    description: 'Blocked user IDs retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  async listBlockIds(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<string[]>> {
    const ids = await this.listBlockedUserIds.execute(user.sub);
    return ApiResponseDto.success(ids, 'Blocked user IDs retrieved');
  }
}
