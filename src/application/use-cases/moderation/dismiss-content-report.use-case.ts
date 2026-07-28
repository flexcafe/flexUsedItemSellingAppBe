import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CONTENT_REPORT_REPOSITORY,
  type IContentReportRepository,
} from '../../../domain/repositories/content-report.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { ContentReportStatus } from '../../../domain/enums/content-report-status.enum.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';
import type { DismissContentReportDto } from '../../dtos/moderation/moderation.dto.js';
import { ContentReportDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class DismissContentReportUseCase {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reports: IContentReportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    reportId: string,
    dto: DismissContentReportDto,
  ): Promise<ContentReportDto> {
    await requireAdminPermission(
      this.users,
      adminId,
      AdminPermission.MANAGE_REPORTS,
    );

    const existing = await this.reports.findById(reportId);
    if (!existing) {
      throw new NotFoundException('Content report not found');
    }
    if (existing.status !== ContentReportStatus.PENDING) {
      throw new ConflictException('Only pending reports can be dismissed');
    }

    const row = await this.reports.review({
      reportId,
      adminId,
      status: ContentReportStatus.DISMISSED,
      adminNote: dto.adminNote,
    });

    await this.users.createNotification({
      userId: row.reporterId,
      eventKey: 'CONTENT_REPORT_DISMISSED_CLIENT',
      metadata: { reportId: row.id },
      title: 'Report reviewed',
      message:
        dto.reporterMessage?.trim() ||
        'We reviewed your report and did not take further action at this time.',
      referenceId: row.id,
    });

    return new ContentReportDto(row);
  }
}
