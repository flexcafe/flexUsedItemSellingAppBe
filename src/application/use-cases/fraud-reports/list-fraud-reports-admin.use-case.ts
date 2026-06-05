import { Inject, Injectable } from '@nestjs/common';
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
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

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
    await requireAdminPermission(
      this.users,
      adminId,
      AdminPermission.MANAGE_REPORTS,
    );
    const rows = await this.fraudReports.listForAdmin(status);
    return rows.map((row) => new FraudReportDto(row));
  }
}
