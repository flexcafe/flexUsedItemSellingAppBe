import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FraudReportStatus } from '../../../domain/enums/fraud-report-status.enum.js';
import { FraudType } from '../../../domain/enums/fraud-type.enum.js';
import type { FraudReportData } from '../../../domain/repositories/fraud-report.repository.interface.js';

export class FraudReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty()
  reporterNickname: string;

  @ApiProperty()
  reporterPhone: string;

  @ApiProperty()
  reportedUserId: string;

  @ApiProperty()
  reportedUserNickname: string;

  @ApiProperty()
  reportedUserPhone: string;

  @ApiProperty()
  fraudUserName: string;

  @ApiProperty()
  reportedReferralCode: string;

  @ApiProperty()
  tradeDate: Date;

  @ApiPropertyOptional({ nullable: true })
  tradeTime: string | null;

  @ApiProperty({ enum: FraudType })
  fraudType: FraudType;

  @ApiProperty()
  details: string;

  @ApiProperty({ enum: FraudReportStatus })
  status: FraudReportStatus;

  @ApiPropertyOptional({ nullable: true })
  adminNote: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedById: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt: Date | null;

  @ApiProperty()
  reportedUserIsBanned: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(data: FraudReportData) {
    this.id = data.id;
    this.reporterId = data.reporterId;
    this.reporterNickname = data.reporterNickname;
    this.reporterPhone = data.reporterPhone;
    this.reportedUserId = data.reportedUserId;
    this.reportedUserNickname = data.reportedUserNickname;
    this.reportedUserPhone = data.reportedUserPhone;
    this.fraudUserName = data.fraudUserName;
    this.reportedReferralCode = data.reportedReferralCode;
    this.tradeDate = data.tradeDate;
    this.tradeTime = data.tradeTime;
    this.fraudType = data.fraudType;
    this.details = data.details;
    this.status = data.status;
    this.adminNote = data.adminNote;
    this.reviewedById = data.reviewedById;
    this.reviewedAt = data.reviewedAt;
    this.reportedUserIsBanned = data.reportedUserIsBanned;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
