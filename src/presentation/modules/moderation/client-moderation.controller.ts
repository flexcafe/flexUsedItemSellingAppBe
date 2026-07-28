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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import {
  BlockUserDto,
  ContentReportDto,
  SubmitContentReportDto,
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

@ApiTags('Client Moderation')
@Controller(`${ROUTE_PREFIX.client}/moderation`)
@UseGuards(JwtAuthGuard, ThrottlerGuard)
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
  @Throttle({ 'admin-notify-user': { limit: 20, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Flag objectionable content',
    description:
      'Report a listing, chat message, review, or user profile. Notifies admins for 24-hour review.',
  })
  @ApiSuccessResponse(ContentReportDto, {
    status: HttpStatus.CREATED,
    description: 'Content report submitted',
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
  @ApiOperation({ summary: 'List my content reports' })
  @ApiArraySuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content reports retrieved',
  })
  async myReports(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<ContentReportDto[]>> {
    const rows = await this.listMyContentReports.execute(user.sub);
    return ApiResponseDto.success(rows, 'Content reports retrieved');
  }

  @Post('blocks')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'admin-notify-user': { limit: 30, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Block an abusive user',
    description:
      'Instantly excludes the user from your feed/chat. Also notifies the developer/admin team.',
  })
  @ApiSuccessResponse(UserBlockDto, {
    status: HttpStatus.CREATED,
    description: 'User blocked',
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
  @ApiOperation({ summary: 'Unblock a user' })
  async unblock(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponseDto<{ blockedUserId: string; unblocked: boolean }>> {
    const row = await this.unblockUser.execute(user.sub, userId);
    return ApiResponseDto.success(row, 'User unblocked');
  }

  @Get('blocks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List users I blocked' })
  @ApiArraySuccessResponse(UserBlockDto, {
    status: HttpStatus.OK,
    description: 'Blocked users retrieved',
  })
  async listBlocks(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<UserBlockDto[]>> {
    const rows = await this.listBlockedUsers.execute(user.sub);
    return ApiResponseDto.success(rows, 'Blocked users retrieved');
  }

  @Get('blocks/ids')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'IDs to hide from feed instantly after blocking',
    description:
      'Includes users you blocked and users who blocked you. Use to filter catalog/chat client-side.',
  })
  async listBlockIds(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<string[]>> {
    const ids = await this.listBlockedUserIds.execute(user.sub);
    return ApiResponseDto.success(ids, 'Blocked user IDs retrieved');
  }
}
