import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import {
  BanUserDto,
  ConfirmFraudReportDto,
  DismissFraudReportDto,
  FraudReportDto,
  FraudReportFilterDto,
} from '../../../application/dtos/fraud-reports/index.js';
import { ListFraudReportsAdminUseCase } from '../../../application/use-cases/fraud-reports/list-fraud-reports-admin.use-case.js';
import { ConfirmFraudReportUseCase } from '../../../application/use-cases/fraud-reports/confirm-fraud-report.use-case.js';
import { DismissFraudReportUseCase } from '../../../application/use-cases/fraud-reports/dismiss-fraud-report.use-case.js';
import { BanUserAdminUseCase } from '../../../application/use-cases/fraud-reports/ban-user-admin.use-case.js';
import { UnbanUserAdminUseCase } from '../../../application/use-cases/fraud-reports/unban-user-admin.use-case.js';

@ApiTags('Admin Dashboard Fraud Reports')
@Controller(`${ROUTE_PREFIX.adminDashboard}/fraud-reports`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminFraudReportsController {
  constructor(
    private readonly listFraudReportsAdmin: ListFraudReportsAdminUseCase,
    private readonly confirmFraudReport: ConfirmFraudReportUseCase,
    private readonly dismissFraudReport: DismissFraudReportUseCase,
    private readonly banUserAdmin: BanUserAdminUseCase,
    private readonly unbanUserAdmin: UnbanUserAdminUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List fraud reports for admin review',
    description:
      'Also surfaced via FRAUD_REPORT_SUBMITTED_ADMIN notifications.',
  })
  @ApiArraySuccessResponse(FraudReportDto, {
    status: HttpStatus.OK,
    description: 'Fraud reports retrieved',
  })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: FraudReportFilterDto,
  ): Promise<ApiResponseDto<FraudReportDto[]>> {
    const rows = await this.listFraudReportsAdmin.execute(
      user.sub,
      query.status,
    );
    return ApiResponseDto.success(rows, 'Fraud reports retrieved');
  }

  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user account (reversible)' })
  @ApiSuccessResponse(Object, {
    status: HttpStatus.OK,
    description: 'User banned',
  })
  async banUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: BanUserDto,
  ): Promise<ApiResponseDto<{ userId: string; isBanned: boolean }>> {
    const result = await this.banUserAdmin.execute(user.sub, userId, dto);
    return ApiResponseDto.success(result, 'User banned');
  }

  @Post('users/:userId/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lift ban on a user account' })
  @ApiSuccessResponse(Object, {
    status: HttpStatus.OK,
    description: 'User unbanned',
  })
  async unbanUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponseDto<{ userId: string; isBanned: boolean }>> {
    const result = await this.unbanUserAdmin.execute(user.sub, userId);
    return ApiResponseDto.success(result, 'User unbanned');
  }

  @Post(':reportId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm fraud, notify reporter, optionally ban reported user',
  })
  @ApiSuccessResponse(FraudReportDto, {
    status: HttpStatus.OK,
    description: 'Fraud report confirmed',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Report is not pending',
  })
  async confirm(
    @CurrentUser() user: JwtPayload,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ConfirmFraudReportDto,
  ): Promise<ApiResponseDto<FraudReportDto>> {
    const row = await this.confirmFraudReport.execute(user.sub, reportId, dto);
    return ApiResponseDto.success(row, 'Fraud report confirmed');
  }

  @Post(':reportId/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dismiss fraud report and notify reporter',
  })
  @ApiSuccessResponse(FraudReportDto, {
    status: HttpStatus.OK,
    description: 'Fraud report dismissed',
  })
  async dismiss(
    @CurrentUser() user: JwtPayload,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: DismissFraudReportDto,
  ): Promise<ApiResponseDto<FraudReportDto>> {
    const row = await this.dismissFraudReport.execute(user.sub, reportId, dto);
    return ApiResponseDto.success(row, 'Fraud report dismissed');
  }
}
