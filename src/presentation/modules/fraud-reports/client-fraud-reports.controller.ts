import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  FraudReportDto,
  SubmitFraudReportDto,
} from '../../../application/dtos/fraud-reports/index.js';
import { SubmitFraudReportUseCase } from '../../../application/use-cases/fraud-reports/submit-fraud-report.use-case.js';
import { ListMyFraudReportsUseCase } from '../../../application/use-cases/fraud-reports/list-my-fraud-reports.use-case.js';

@ApiTags('Client Fraud Reports')
@Controller(`${ROUTE_PREFIX.client}/fraud-reports`)
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ClientFraudReportsController {
  constructor(
    private readonly submitFraudReport: SubmitFraudReportUseCase,
    private readonly listMyFraudReports: ListMyFraudReportsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'admin-notify-user': { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Submit a fraud report against another user',
    description:
      'Identifies the reported user by reportedReferralCode (from public profile). Notifies all admins.',
  })
  @ApiSuccessResponse(FraudReportDto, {
    status: HttpStatus.CREATED,
    description: 'Fraud report submitted',
  })
  async submit(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitFraudReportDto,
  ): Promise<ApiResponseDto<FraudReportDto>> {
    const row = await this.submitFraudReport.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Fraud report submitted');
  }

  @Get('mine')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List my submitted fraud reports' })
  @ApiArraySuccessResponse(FraudReportDto, {
    status: HttpStatus.OK,
    description: 'Fraud reports retrieved',
  })
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<FraudReportDto[]>> {
    const rows = await this.listMyFraudReports.execute(user.sub);
    return ApiResponseDto.success(rows, 'Fraud reports retrieved');
  }
}
