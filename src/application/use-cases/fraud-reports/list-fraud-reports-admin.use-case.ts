import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  FRAUD_REPORT_REPOSITORY,
  type IFraudReportRepository,
} from '../../../domain/repositories/fraud-report.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { FraudReportStatus } from '../../../domain/enums/fraud-report-status.enum.js';
import { FraudReportDto } from '../../dtos/fraud-reports/fraud-report.dto.js';

@Injectable()
export class ListFraudReportsAdminUseCase {
  constructor(
    @Inject(FRAUD_REPORT_REPOSITORY)
    private readonly fraudReports: IFraudReportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    status?: FraudReportStatus,
  ): Promise<FraudReportDto[]> {
    await this.assertAdmin(adminId);
    const rows = await this.fraudReports.listForAdmin(status);
    return rows.map((row) => new FraudReportDto(row));
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.users.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
