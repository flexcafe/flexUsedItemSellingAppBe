import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ContentReportReason } from '../../domain/enums/content-report-reason.enum.js';
import { ContentReportStatus } from '../../domain/enums/content-report-status.enum.js';
import { ContentReportTargetType } from '../../domain/enums/content-report-target-type.enum.js';
import type {
  ContentReportData,
  CreateContentReportData,
  IContentReportRepository,
  ReviewContentReportData,
} from '../../domain/repositories/content-report.repository.interface.js';

const USER_SELECT = {
  id: true,
  nickname: true,
} as const;

const REPORT_INCLUDE = {
  reporter: { select: USER_SELECT },
  reportedUser: { select: USER_SELECT },
} as const;

@Injectable()
export class ContentReportRepository implements IContentReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateContentReportData): Promise<ContentReportData> {
    const row = await this.prisma.contentReport.create({
      data: {
        reporterId: data.reporterId,
        reportedUserId: data.reportedUserId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        details: data.details?.trim() || null,
      },
      include: REPORT_INCLUDE,
    });
    return this.map(row);
  }

  async findById(id: string): Promise<ContentReportData | null> {
    const row = await this.prisma.contentReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    return row ? this.map(row) : null;
  }

  async listByReporter(reporterId: string): Promise<ContentReportData[]> {
    const rows = await this.prisma.contentReport.findMany({
      where: { reporterId },
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async listAdmin(status?: ContentReportStatus): Promise<ContentReportData[]> {
    const rows = await this.prisma.contentReport.findMany({
      where: status ? { status } : undefined,
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.map(r));
  }

  async review(data: ReviewContentReportData): Promise<ContentReportData> {
    try {
      const row = await this.prisma.contentReport.update({
        where: { id: data.reportId },
        data: {
          status: data.status,
          adminNote: data.adminNote?.trim() || null,
          reviewedById: data.adminId,
          reviewedAt: new Date(),
        },
        include: REPORT_INCLUDE,
      });
      return this.map(row);
    } catch {
      throw new NotFoundException('Content report not found');
    }
  }

  private map(row: {
    id: string;
    reporterId: string;
    reportedUserId: string;
    targetType: string;
    targetId: string;
    reason: string;
    details: string | null;
    status: string;
    adminNote: string | null;
    reviewedById: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    reporter: { nickname: string };
    reportedUser: { nickname: string };
  }): ContentReportData {
    return {
      id: row.id,
      reporterId: row.reporterId,
      reporterNickname: row.reporter.nickname,
      reportedUserId: row.reportedUserId,
      reportedUserNickname: row.reportedUser.nickname,
      targetType: row.targetType as ContentReportTargetType,
      targetId: row.targetId,
      reason: row.reason as ContentReportReason,
      details: row.details,
      status: row.status as ContentReportStatus,
      adminNote: row.adminNote,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
