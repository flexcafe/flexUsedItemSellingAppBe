import {
  BadRequestException,
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
import type { SubmitFraudReportDto } from '../../dtos/fraud-reports/submit-fraud-report.dto.js';
import { FraudReportDto } from '../../dtos/fraud-reports/fraud-report.dto.js';

@Injectable()
export class SubmitFraudReportUseCase {
  constructor(
    @Inject(FRAUD_REPORT_REPOSITORY)
    private readonly fraudReports: IFraudReportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    reporterId: string,
    dto: SubmitFraudReportDto,
  ): Promise<FraudReportDto> {
    const reporter = await this.users.findById(reporterId);
    if (!reporter) {
      throw new NotFoundException('User not found');
    }

    const code = dto.reportedReferralCode.trim();
    const reported = await this.users.findByReferralCode(code);
    if (!reported) {
      throw new BadRequestException('Invalid reported referral code');
    }
    if (reported.id === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    if (reported.adminRoleId) {
      throw new BadRequestException('Cannot report an admin account');
    }

    const row = await this.fraudReports.create({
      reporterId,
      reportedUserId: reported.id,
      fraudUserName: dto.fraudUserName.trim(),
      reportedReferralCode: code,
      tradeDate: new Date(dto.tradeDate),
      tradeTime: dto.tradeTime?.trim(),
      fraudType: dto.fraudType,
      details: dto.details.trim(),
    });

    await this.users.createNotification({
      userId: reporterId,
      eventKey: 'FRAUD_REPORT_SUBMITTED_CLIENT',
      metadata: { reportId: row.id, reportedUserId: row.reportedUserId },
      title: 'Fraud report submitted',
      message:
        'Your report was sent to the admin team. You will be notified after review.',
      referenceId: row.id,
    });

    const adminIds = await this.users.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'FRAUD_REPORT_SUBMITTED_ADMIN',
          metadata: {
            reportId: row.id,
            reporterId: row.reporterId,
            reportedUserId: row.reportedUserId,
            fraudUserName: row.fraudUserName,
            reportedReferralCode: row.reportedReferralCode,
            fraudType: row.fraudType,
          },
          title: 'New fraud report',
          message: `${row.reporterNickname} reported ${row.fraudUserName} (${row.reportedReferralCode}) for ${row.fraudType}.`,
          referenceId: row.id,
        }),
      ),
    );

    return new FraudReportDto(row);
  }
}
