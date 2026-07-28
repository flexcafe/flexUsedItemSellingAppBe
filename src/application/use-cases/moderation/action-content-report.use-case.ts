import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CONTENT_REPORT_REPOSITORY,
  type IContentReportRepository,
} from '../../../domain/repositories/content-report.repository.interface.js';
import {
  MODERATION_SUPPORT_REPOSITORY,
  type IModerationSupportRepository,
} from '../../../domain/repositories/moderation-support.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { ContentReportStatus } from '../../../domain/enums/content-report-status.enum.js';
import { ContentReportTargetType } from '../../../domain/enums/content-report-target-type.enum.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';
import type { ActionContentReportDto } from '../../dtos/moderation/moderation.dto.js';
import { ContentReportDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class ActionContentReportUseCase {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reports: IContentReportRepository,
    @Inject(MODERATION_SUPPORT_REPOSITORY)
    private readonly moderation: IModerationSupportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    reportId: string,
    dto: ActionContentReportDto,
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
      throw new ConflictException('Only pending reports can be actioned');
    }

    await this.removeTargetContent(existing.targetType, existing.targetId);

    const ejectUser = dto.ejectUser !== false;
    if (ejectUser) {
      const reported = await this.users.findById(existing.reportedUserId);
      if (!reported) {
        throw new NotFoundException('Reported user not found');
      }
      if (reported.isAdmin()) {
        throw new ForbiddenException('Cannot ban an admin account');
      }
      await this.users.setUserBanned(
        existing.reportedUserId,
        true,
        dto.adminNote ??
          `Ejected for objectionable content (report ${existing.id})`,
      );
      await this.users.createNotification({
        userId: existing.reportedUserId,
        eventKey: 'ACCOUNT_BANNED_CLIENT',
        metadata: { reportId: existing.id, banReason: dto.adminNote ?? null },
        title: 'Account suspended',
        message:
          'Your account was suspended for posting objectionable content that violates our Terms of Use.',
        referenceId: existing.reportedUserId,
      });
    }

    const row = await this.reports.review({
      reportId,
      adminId,
      status: ContentReportStatus.ACTIONED,
      adminNote: dto.adminNote,
    });

    await this.users.createNotification({
      userId: row.reporterId,
      eventKey: 'CONTENT_REPORT_ACTIONED_CLIENT',
      metadata: {
        reportId: row.id,
        ejected: ejectUser,
        targetType: row.targetType,
        targetId: row.targetId,
      },
      title: 'Report resolved',
      message:
        dto.reporterMessage?.trim() ||
        'We removed the reported content. Thank you for helping keep the community safe.',
      referenceId: row.id,
    });

    return new ContentReportDto(row);
  }

  private async removeTargetContent(
    targetType: ContentReportTargetType,
    targetId: string,
  ): Promise<void> {
    switch (targetType) {
      case ContentReportTargetType.LISTING:
        await this.moderation.softRemoveListing(targetId);
        break;
      case ContentReportTargetType.CHAT_MESSAGE:
        await this.moderation.hideChatMessage(targetId);
        break;
      case ContentReportTargetType.REVIEW:
        await this.moderation.hideReview(targetId);
        break;
      case ContentReportTargetType.USER_PROFILE:
        // Profile text cleanup is handled by ejecting/banning the user.
        break;
    }
  }
}
