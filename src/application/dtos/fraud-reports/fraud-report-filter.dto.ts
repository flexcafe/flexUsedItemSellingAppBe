import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FraudReportStatus } from '../../../domain/enums/fraud-report-status.enum.js';

export class FraudReportFilterDto {
  @ApiPropertyOptional({ enum: FraudReportStatus })
  @IsOptional()
  @IsEnum(FraudReportStatus)
  status?: FraudReportStatus;
}
