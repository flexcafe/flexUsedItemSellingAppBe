import {
  BadRequestException,
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
import type { SubmitContentReportDto } from '../../dtos/moderation/moderation.dto.js';
import { ContentReportDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class SubmitContentReportUseCase {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reports: IContentReportRepository,
    @Inject(MODERATION_SUPPORT_REPOSITORY)
    private readonly moderation: IModerationSupportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    reporterId: string,
    dto: SubmitContentReportDto,
  ): Promise<ContentReportDto> {
    const reporter = await this.users.findById(reporterId);
    if (!reporter) {
      throw new NotFoundException('User not found');
    }

    const owner = await this.moderation.resolveContentOwner(
      dto.targetType,
      dto.targetId,
    );
    if (!owner) {
      throw new NotFoundException('Reported content not found');
    }
    if (owner.ownerUserId === reporterId) {
      throw new BadRequestException('You cannot report your own content');
    }

    const reported = await this.users.findById(owner.ownerUserId);
    if (!reported) {
      throw new NotFoundException('Reported user not found');
    }
    if (reported.adminRoleId) {
      throw new BadRequestException('Cannot report an admin account');
    }

    const row = await this.reports.create({
      reporterId,
      reportedUserId: owner.ownerUserId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      details: dto.details,
    });

    await this.users.createNotification({
      userId: reporterId,
      eventKey: 'CONTENT_REPORT_SUBMITTED_CLIENT',
      metadata: {
        reportId: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
      },
      title: 'Report submitted',
      message:
        'Thanks for reporting. Our team reviews objectionable content reports within 24 hours.',
      referenceId: row.id,
    });

    const adminIds = await this.users.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'CONTENT_REPORT_SUBMITTED_ADMIN',
          metadata: {
            reportId: row.id,
            reporterId: row.reporterId,
            reportedUserId: row.reportedUserId,
            targetType: row.targetType,
            targetId: row.targetId,
            reason: row.reason,
          },
          title: 'New content report',
          message: `${row.reporterNickname} flagged ${row.targetType} (${row.reason}). Act within 24 hours.`,
          referenceId: row.id,
        }),
      ),
    );

    return new ContentReportDto(row);
  }
}
