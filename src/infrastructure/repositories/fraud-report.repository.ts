import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { FraudReportStatus } from '../../domain/enums/fraud-report-status.enum.js';
import { FraudType } from '../../domain/enums/fraud-type.enum.js';
import type {
  CreateFraudReportData,
  FraudReportData,
  IFraudReportRepository,
  ReviewFraudReportData,
} from '../../domain/repositories/fraud-report.repository.interface.js';

const { FraudReportStatus: PrismaFraudReportStatus, FraudType: PrismaFraudType } =
  PrismaPkg;

const USER_SELECT = {
  id: true,
  nickname: true,
  phone: true,
  isBanned: true,
} as const;

const REPORT_INCLUDE = {
  reporter: { select: USER_SELECT },
  reportedUser: { select: USER_SELECT },
} as const;

@Injectable()
export class FraudReportRepository implements IFraudReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFraudReportData): Promise<FraudReportData> {
    const row = await this.prisma.fraudReport.create({
      data: {
        reporterId: data.reporterId,
        reportedUserId: data.reportedUserId,
        fraudUserName: data.fraudUserName,
        reportedReferralCode: data.reportedReferralCode,
        tradeDate: data.tradeDate,
        tradeTime: data.tradeTime ?? null,
        fraudType: data.fraudType as unknown as PrismaPkg.FraudType,
        details: data.details,
        status: PrismaFraudReportStatus.PENDING,
      },
      include: REPORT_INCLUDE,
    });
    return this.map(row);
  }

  async findById(id: string): Promise<FraudReportData | null> {
    const row = await this.prisma.fraudReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    return row ? this.map(row) : null;
  }

  async listByReporterId(reporterId: string): Promise<FraudReportData[]> {
    const rows = await this.prisma.fraudReport.findMany({
      where: { reporterId },
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.map(row));
  }

  async listForAdmin(
    status?: FraudReportStatus,
  ): Promise<FraudReportData[]> {
    const rows = await this.prisma.fraudReport.findMany({
      where: status
        ? { status: status as unknown as PrismaPkg.FraudReportStatus }
        : undefined,
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.map(row));
  }

  async review(data: ReviewFraudReportData): Promise<FraudReportData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const report = await tx.fraudReport.findUnique({
        where: { id: data.reportId },
      });
      if (!report) {
        throw new NotFoundException('Fraud report not found');
      }
      if (report.status !== PrismaFraudReportStatus.PENDING) {
        throw new ConflictException('Only pending fraud reports can be reviewed');
      }

      return tx.fraudReport.update({
        where: { id: data.reportId },
        data: {
          status: data.status as unknown as PrismaPkg.FraudReportStatus,
          adminNote: data.adminNote ?? null,
          reviewedById: data.adminId,
          reviewedAt: new Date(),
        },
        include: REPORT_INCLUDE,
      });
    });

    return this.map(row);
  }

  private map(
    row: PrismaPkg.FraudReport & {
      reporter: { id: string; nickname: string; phone: string; isBanned: boolean };
      reportedUser: {
        id: string;
        nickname: string;
        phone: string;
        isBanned: boolean;
      };
    },
  ): FraudReportData {
    return {
      id: row.id,
      reporterId: row.reporterId,
      reporterNickname: row.reporter.nickname,
      reporterPhone: row.reporter.phone,
      reportedUserId: row.reportedUserId,
      reportedUserNickname: row.reportedUser.nickname,
      reportedUserPhone: row.reportedUser.phone,
      fraudUserName: row.fraudUserName,
      reportedReferralCode: row.reportedReferralCode,
      tradeDate: row.tradeDate,
      tradeTime: row.tradeTime,
      fraudType: row.fraudType as FraudType,
      details: row.details,
      status: row.status as FraudReportStatus,
      adminNote: row.adminNote,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt,
      reportedUserIsBanned: row.reportedUser.isBanned,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
