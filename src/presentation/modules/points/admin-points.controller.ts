import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
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
import { ManagePointConfigUseCase } from '../../../application/use-cases/points/manage-point-config.use-case.js';
import { ListWithdrawalsUseCase } from '../../../application/use-cases/points/list-withdrawals.use-case.js';
import { ApproveWithdrawalUseCase } from '../../../application/use-cases/points/approve-withdrawal.use-case.js';
import { RejectWithdrawalUseCase } from '../../../application/use-cases/points/reject-withdrawal.use-case.js';
import { MarkWithdrawalPaidUseCase } from '../../../application/use-cases/points/mark-withdrawal-paid.use-case.js';
import {
  ApproveWithdrawalDto,
  MarkWithdrawalPaidDto,
  RankConfigResponseDto,
  RejectWithdrawalDto,
  StarPointConfigDto,
  UpdateRankConfigsDto,
  UpdateStarPointConfigsDto,
  WithdrawalFilterDto,
  WithdrawalRequestDto,
} from '../../../application/dtos/points/index.js';
import {
  ADMIN_APPROVE_WITHDRAWAL_DOC,
  ADMIN_MARK_WITHDRAWAL_PAID_DOC,
  ADMIN_RANK_CONFIG_DOC,
  ADMIN_REJECT_WITHDRAWAL_DOC,
  ADMIN_STAR_CONFIG_DOC,
  ADMIN_WITHDRAWAL_LIST_DOC,
} from './points-system.swagger.js';

@ApiTags('Admin Dashboard Points')
@Controller(`${ROUTE_PREFIX.adminDashboard}`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminPointsController {
  constructor(
    private readonly managePointConfigUseCase: ManagePointConfigUseCase,
    private readonly listWithdrawalsUseCase: ListWithdrawalsUseCase,
    private readonly approveWithdrawalUseCase: ApproveWithdrawalUseCase,
    private readonly rejectWithdrawalUseCase: RejectWithdrawalUseCase,
    private readonly markWithdrawalPaidUseCase: MarkWithdrawalPaidUseCase,
  ) {}

  @Get('points/star-config')
  @ApiOperation({
    summary: 'List star-to-point configuration',
    description: ADMIN_STAR_CONFIG_DOC,
  })
  @ApiArraySuccessResponse(StarPointConfigDto, {
    status: HttpStatus.OK,
    description: 'Star point configs retrieved',
  })
  async listStarConfigs(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<StarPointConfigDto[]>> {
    const configs = await this.managePointConfigUseCase.listStarConfigs(
      user.sub,
    );
    return ApiResponseDto.success(configs, 'Star point configs retrieved');
  }

  @Put('points/star-config')
  @ApiOperation({
    summary: 'Update star-to-point configuration',
    description: ADMIN_STAR_CONFIG_DOC,
  })
  @ApiArraySuccessResponse(StarPointConfigDto, {
    status: HttpStatus.OK,
    description: 'Star point configs updated',
  })
  async updateStarConfigs(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStarPointConfigsDto,
  ): Promise<ApiResponseDto<StarPointConfigDto[]>> {
    const configs = await this.managePointConfigUseCase.updateStarConfigs(
      user.sub,
      dto,
    );
    return ApiResponseDto.success(configs, 'Star point configs updated');
  }

  @Get('points/rank-config')
  @ApiOperation({
    summary: 'List rank configuration',
    description: ADMIN_RANK_CONFIG_DOC,
  })
  @ApiArraySuccessResponse(RankConfigResponseDto, {
    status: HttpStatus.OK,
    description: 'Rank configs retrieved',
  })
  async listRankConfigs(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<RankConfigResponseDto[]>> {
    const configs = await this.managePointConfigUseCase.listRankConfigs(
      user.sub,
    );
    return ApiResponseDto.success(configs, 'Rank configs retrieved');
  }

  @Put('points/rank-config')
  @ApiOperation({
    summary: 'Update rank configuration',
    description: ADMIN_RANK_CONFIG_DOC,
  })
  @ApiArraySuccessResponse(RankConfigResponseDto, {
    status: HttpStatus.OK,
    description: 'Rank configs updated',
  })
  async updateRankConfigs(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRankConfigsDto,
  ): Promise<ApiResponseDto<RankConfigResponseDto[]>> {
    const configs = await this.managePointConfigUseCase.updateRankConfigs(
      user.sub,
      dto,
    );
    return ApiResponseDto.success(configs, 'Rank configs updated');
  }

  @Get('withdrawals')
  @ApiOperation({
    summary: 'List withdrawal requests',
    description: ADMIN_WITHDRAWAL_LIST_DOC,
  })
  @ApiArraySuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.OK,
    description: 'Withdrawal requests retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admin users can perform this action',
  })
  async listWithdrawals(
    @CurrentUser() user: JwtPayload,
    @Query() query: WithdrawalFilterDto,
  ): Promise<ApiResponseDto<WithdrawalRequestDto[]>> {
    const rows = await this.listWithdrawalsUseCase.execute(
      user.sub,
      query.status,
    );
    return ApiResponseDto.success(rows, 'Withdrawal requests retrieved');
  }

  @Post('withdrawals/:withdrawalId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve withdrawal request',
    description: ADMIN_APPROVE_WITHDRAWAL_DOC,
  })
  @ApiSuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.OK,
    description: 'Withdrawal approved',
  })
  async approveWithdrawal(
    @CurrentUser() user: JwtPayload,
    @Param('withdrawalId', ParseUUIDPipe) withdrawalId: string,
    @Body() dto: ApproveWithdrawalDto,
  ): Promise<ApiResponseDto<WithdrawalRequestDto>> {
    const row = await this.approveWithdrawalUseCase.execute(
      user.sub,
      withdrawalId,
      dto,
    );
    return ApiResponseDto.success(row, 'Withdrawal approved');
  }

  @Post('withdrawals/:withdrawalId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject withdrawal request',
    description: ADMIN_REJECT_WITHDRAWAL_DOC,
  })
  @ApiSuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.OK,
    description: 'Withdrawal rejected',
  })
  async rejectWithdrawal(
    @CurrentUser() user: JwtPayload,
    @Param('withdrawalId', ParseUUIDPipe) withdrawalId: string,
    @Body() dto: RejectWithdrawalDto,
  ): Promise<ApiResponseDto<WithdrawalRequestDto>> {
    const row = await this.rejectWithdrawalUseCase.execute(
      user.sub,
      withdrawalId,
      dto,
    );
    return ApiResponseDto.success(row, 'Withdrawal rejected');
  }

  @Post('withdrawals/:withdrawalId/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark approved withdrawal as paid',
    description: ADMIN_MARK_WITHDRAWAL_PAID_DOC,
  })
  @ApiSuccessResponse(WithdrawalRequestDto, {
    status: HttpStatus.OK,
    description: 'Withdrawal marked as paid',
  })
  async markWithdrawalPaid(
    @CurrentUser() user: JwtPayload,
    @Param('withdrawalId', ParseUUIDPipe) withdrawalId: string,
    @Body() dto: MarkWithdrawalPaidDto,
  ): Promise<ApiResponseDto<WithdrawalRequestDto>> {
    const row = await this.markWithdrawalPaidUseCase.execute(
      user.sub,
      withdrawalId,
      dto,
    );
    return ApiResponseDto.success(row, 'Withdrawal marked as paid');
  }
}
