import { ContentReportReason } from '../enums/content-report-reason.enum.js';
import { ContentReportStatus } from '../enums/content-report-status.enum.js';
import { ContentReportTargetType } from '../enums/content-report-target-type.enum.js';

export interface ContentReportData {
  id: string;
  reporterId: string;
  reporterNickname: string;
  reportedUserId: string;
  reportedUserNickname: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details: string | null;
  status: ContentReportStatus;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContentReportData {
  reporterId: string;
  reportedUserId: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details?: string;
}

export interface ReviewContentReportData {
  reportId: string;
  adminId: string;
  status: ContentReportStatus;
  adminNote?: string;
}

export interface IContentReportRepository {
  create(data: CreateContentReportData): Promise<ContentReportData>;
  findById(id: string): Promise<ContentReportData | null>;
  listByReporter(reporterId: string): Promise<ContentReportData[]>;
  listAdmin(status?: ContentReportStatus): Promise<ContentReportData[]>;
  review(data: ReviewContentReportData): Promise<ContentReportData>;
}

export const CONTENT_REPORT_REPOSITORY = Symbol('CONTENT_REPORT_REPOSITORY');
