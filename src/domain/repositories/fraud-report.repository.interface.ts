import type { FraudReportStatus } from '../enums/fraud-report-status.enum.js';
import type { FraudType } from '../enums/fraud-type.enum.js';

export interface FraudReportData {
  id: string;
  reporterId: string;
  reporterNickname: string;
  reporterPhone: string;
  reportedUserId: string;
  reportedUserNickname: string;
  reportedUserPhone: string;
  fraudUserName: string;
  reportedReferralCode: string;
  tradeDate: Date;
  tradeTime: string | null;
  fraudType: FraudType;
  details: string;
  status: FraudReportStatus;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reportedUserIsBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFraudReportData {
  reporterId: string;
  reportedUserId: string;
  fraudUserName: string;
  reportedReferralCode: string;
  tradeDate: Date;
  tradeTime?: string;
  fraudType: FraudType;
  details: string;
}

export interface ReviewFraudReportData {
  reportId: string;
  adminId: string;
  status: FraudReportStatus.CONFIRMED_FRAUD | FraudReportStatus.DISMISSED;
  adminNote?: string;
}

export interface IFraudReportRepository {
  create(data: CreateFraudReportData): Promise<FraudReportData>;
  findById(id: string): Promise<FraudReportData | null>;
  listByReporterId(reporterId: string): Promise<FraudReportData[]>;
  listForAdmin(status?: FraudReportStatus): Promise<FraudReportData[]>;
  review(data: ReviewFraudReportData): Promise<FraudReportData>;
}

export const FRAUD_REPORT_REPOSITORY = Symbol('FRAUD_REPORT_REPOSITORY');
