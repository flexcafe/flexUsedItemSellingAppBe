import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContentReportReason } from '../../../domain/enums/content-report-reason.enum.js';
import { ContentReportStatus } from '../../../domain/enums/content-report-status.enum.js';
import { ContentReportTargetType } from '../../../domain/enums/content-report-target-type.enum.js';
import type { ContentReportData } from '../../../domain/repositories/content-report.repository.interface.js';
import type { UserBlockData } from '../../../domain/repositories/user-block.repository.interface.js';
import type { TermsOfServiceData } from '../../../domain/repositories/moderation-support.repository.interface.js';

export class TermsOfServiceDto {
  @ApiProperty()
  version: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  publishedAt: Date;

  constructor(row: TermsOfServiceData) {
    this.version = row.version;
    this.title = row.title;
    this.content = row.content;
    this.publishedAt = row.publishedAt;
  }
}

export class AcceptTermsDto {
  @ApiProperty({
    example: '1.0',
    description: 'Must match the active Terms of Use version',
  })
  @IsString()
  @IsNotEmpty()
  termsVersion: string;
}

export class TermsAcceptanceStatusDto {
  @ApiProperty()
  currentVersion: string;

  @ApiProperty()
  acceptedVersion: string | null;

  @ApiProperty()
  acceptedAt: Date | null;

  @ApiProperty()
  needsAcceptance: boolean;
}

export class SubmitContentReportDto {
  @ApiProperty({ enum: ContentReportTargetType })
  @IsEnum(ContentReportTargetType)
  targetType: ContentReportTargetType;

  @ApiProperty({ description: 'ID of the listing, message, review, or user' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: ContentReportReason })
  @IsEnum(ContentReportReason)
  reason: ContentReportReason;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

export class ContentReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty()
  reporterNickname: string;

  @ApiProperty()
  reportedUserId: string;

  @ApiProperty()
  reportedUserNickname: string;

  @ApiProperty({ enum: ContentReportTargetType })
  targetType: ContentReportTargetType;

  @ApiProperty()
  targetId: string;

  @ApiProperty({ enum: ContentReportReason })
  reason: ContentReportReason;

  @ApiProperty({ nullable: true })
  details: string | null;

  @ApiProperty({ enum: ContentReportStatus })
  status: ContentReportStatus;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(row: ContentReportData) {
    this.id = row.id;
    this.reporterId = row.reporterId;
    this.reporterNickname = row.reporterNickname;
    this.reportedUserId = row.reportedUserId;
    this.reportedUserNickname = row.reportedUserNickname;
    this.targetType = row.targetType;
    this.targetId = row.targetId;
    this.reason = row.reason;
    this.details = row.details;
    this.status = row.status;
    this.adminNote = row.adminNote;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}

export class ContentReportFilterDto {
  @ApiPropertyOptional({ enum: ContentReportStatus })
  @IsOptional()
  @IsEnum(ContentReportStatus)
  status?: ContentReportStatus;
}

export class ActionContentReportDto {
  @ApiPropertyOptional({
    description: 'Also ban (eject) the user who created the content',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ejectUser?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;

  @ApiPropertyOptional({
    description: 'Message sent to the reporter after action',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reporterMessage?: string;
}

export class DismissContentReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reporterMessage?: string;
}

export class BlockUserDto {
  @ApiProperty({
    description: 'User ID to block',
  })
  @IsUUID()
  blockedUserId: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class UserBlockDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  blockedUserId: string;

  @ApiProperty()
  blockedNickname: string;

  @ApiProperty()
  blockedReferralCode: string;

  @ApiProperty({ nullable: true })
  reason: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(row: UserBlockData) {
    this.id = row.id;
    this.blockedUserId = row.blockedId;
    this.blockedNickname = row.blockedNickname;
    this.blockedReferralCode = row.blockedReferralCode;
    this.reason = row.reason;
    this.createdAt = row.createdAt;
  }
}

export class AddFilterKeywordDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  keyword: string;
}
