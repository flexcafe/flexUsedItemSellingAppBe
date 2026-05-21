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
import type { ConfirmFraudReportDto } from '../../dtos/fraud-reports/review-fraud-report.dto.js';
import { FraudReportDto } from '../../dtos/fraud-reports/fraud-report.dto.js';

@Injectable()
export class ConfirmFraudReportUseCase {
  constructor(
    @Inject(FRAUD_REPORT_REPOSITORY)
    private readonly fraudReports: IFraudReportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    reportId: string,
    dto: ConfirmFraudReportDto,
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
      status: FraudReportStatus.CONFIRMED_FRAUD,
      adminNote: dto.adminNote,
    });

    if (dto.blockReportedUser) {
      const reported = await this.users.findById(row.reportedUserId);
      if (!reported) {
        throw new NotFoundException('Reported user not found');
      }
      if (reported.isAdmin()) {
        throw new ForbiddenException('Cannot ban an admin account');
      }
      await this.users.setUserBanned(
        row.reportedUserId,
        true,
        dto.adminNote ?? `Fraud confirmed (report ${row.id})`,
      );
    }

    await this.users.createNotification({
      userId: row.reporterId,
      eventKey: 'FRAUD_REPORT_CONFIRMED_CLIENT',
      metadata: {
        reportId: row.id,
        reportedUserId: row.reportedUserId,
        blocked: dto.blockReportedUser,
      },
      title: 'Fraud report confirmed',
      message: dto.reporterMessage,
      referenceId: row.id,
    });

    if (dto.reportedUserMessage?.trim()) {
      await this.users.createNotification({
        userId: row.reportedUserId,
        eventKey: 'FRAUD_REPORT_ACTION_REPORTED_USER',
        metadata: { reportId: row.id },
        title: 'Account action',
        message: dto.reportedUserMessage.trim(),
        referenceId: row.id,
      });
    }

    if (dto.blockReportedUser) {
      await this.users.createNotification({
        userId: row.reportedUserId,
        eventKey: 'ACCOUNT_BANNED_CLIENT',
        metadata: {
          reportId: row.id,
          banReason: dto.adminNote ?? null,
        },
        title: 'Account suspended',
        message:
          'Your account has been suspended following a confirmed fraud report. Contact support if you believe this is a mistake.',
        referenceId: row.reportedUserId,
      });
    }

    const refreshed = await this.fraudReports.findById(reportId);
    return new FraudReportDto(refreshed ?? row);
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.users.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
