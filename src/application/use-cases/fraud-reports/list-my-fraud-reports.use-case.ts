import { Inject, Injectable } from '@nestjs/common';
import {
  FRAUD_REPORT_REPOSITORY,
  type IFraudReportRepository,
} from '../../../domain/repositories/fraud-report.repository.interface.js';
import { FraudReportDto } from '../../dtos/fraud-reports/fraud-report.dto.js';

@Injectable()
export class ListMyFraudReportsUseCase {
  constructor(
    @Inject(FRAUD_REPORT_REPOSITORY)
    private readonly fraudReports: IFraudReportRepository,
  ) {}

  async execute(reporterId: string): Promise<FraudReportDto[]> {
    const rows = await this.fraudReports.listByReporterId(reporterId);
    return rows.map((row) => new FraudReportDto(row));
  }
}
