import { Inject, Injectable } from '@nestjs/common';
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
import { ContentReportDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class ListContentReportsAdminUseCase {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reports: IContentReportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    status?: ContentReportStatus,
  ): Promise<ContentReportDto[]> {
    await requireAdminPermission(
      this.users,
      adminId,
      AdminPermission.MANAGE_REPORTS,
    );
    const rows = await this.reports.listAdmin(status);
    return rows.map((r) => new ContentReportDto(r));
  }
}
