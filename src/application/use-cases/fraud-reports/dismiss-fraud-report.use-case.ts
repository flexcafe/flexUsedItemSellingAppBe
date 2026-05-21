import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FRAUD_REPORT_REPOSITORY,
  type IFraudReportRepository,
} from '../../../domain/repositories/fraud-report.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { FraudReportStatus } from '../../../domain/enums/fraud-report-status.enum.js';
import type { DismissFraudReportDto } from '../../dtos/fraud-reports/review-fraud-report.dto.js';
import { FraudReportDto } from '../../dtos/fraud-reports/fraud-report.dto.js';

@Injectable()
export class DismissFraudReportUseCase {
  constructor(
    @Inject(FRAUD_REPORT_REPOSITORY)
    private readonly fraudReports: IFraudReportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    reportId: string,
    dto: DismissFraudReportDto,
  ): Promise<FraudReportDto> {
    await this.assertAdmin(adminId);

    const existing = await this.fraudReports.findById(reportId);
    if (!existing) {
      throw new NotFoundException('Fraud report not found');
    }
    if (existing.status !== FraudReportStatus.PENDING) {
      throw new ConflictException('Only pending fraud reports can be reviewed');
    }

    const row = await this.fraudReports.review({
      reportId,
      adminId,
      status: FraudReportStatus.DISMISSED,
      adminNote: dto.adminNote,
    });

    await this.users.createNotification({
      userId: row.reporterId,
      eventKey: 'FRAUD_REPORT_DISMISSED_CLIENT',
      metadata: { reportId: row.id },
      title: 'Fraud report reviewed',
      message: dto.reporterMessage,
      referenceId: row.id,
    });

    return new FraudReportDto(row);
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.users.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
