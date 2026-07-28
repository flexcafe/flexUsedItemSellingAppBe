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
import type {
  ContentFilterKeywordData,
  TermsOfServiceData,
} from '../../../domain/repositories/moderation-support.repository.interface.js';

export class TermsOfServiceDto {
  @ApiProperty({ example: '1.0', description: 'Active Terms of Use version' })
  version: string;

  @ApiProperty({ example: 'Terms of Use' })
  title: string;

  @ApiProperty({
    example:
      'By using this app you agree to our zero-tolerance policy for objectionable content...',
    description: 'Full EULA / Terms body to display before register or login',
  })
  content: string;

  @ApiProperty({
    example: '2026-07-29T00:00:00.000Z',
    description: 'When this version was published',
  })
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
    description:
      'Must match the active Terms of Use version from GET /client/legal/terms',
  })
  @IsString()
  @IsNotEmpty()
  termsVersion: string;
}

export class TermsAcceptanceStatusDto {
  @ApiProperty({ example: '1.0', description: 'Currently active Terms version' })
  currentVersion: string;

  @ApiProperty({
    example: '1.0',
    nullable: true,
    description: 'Version the user last accepted, or null if never accepted',
  })
  acceptedVersion: string | null;

  @ApiProperty({
    example: '2026-07-29T12:00:00.000Z',
    nullable: true,
    description: 'When the user last accepted Terms',
  })
  acceptedAt: Date | null;

  @ApiProperty({
    example: false,
    description:
      'If true, force re-accept (e.g. Terms version changed since last acceptance)',
  })
  needsAcceptance: boolean;
}

export class SubmitContentReportDto {
  @ApiProperty({
    enum: ContentReportTargetType,
    example: ContentReportTargetType.LISTING,
    description: 'Type of user-generated content being flagged',
  })
  @IsEnum(ContentReportTargetType)
  targetType: ContentReportTargetType;

  @ApiProperty({
    example: '11111111-1111-4111-8111-111111111111',
    description: 'ID of the listing, chat message, review, or user profile',
  })
  @IsUUID()
  targetId: string;

  @ApiProperty({
    enum: ContentReportReason,
    example: ContentReportReason.OBJECTIONABLE_CONTENT,
    description: 'Why the content is being reported',
  })
  @IsEnum(ContentReportReason)
  reason: ContentReportReason;

  @ApiPropertyOptional({
    example: 'Contains hate speech in the description',
    maxLength: 2000,
    description: 'Optional extra context for moderators',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

export class ContentReportDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222222' })
  id: string;

  @ApiProperty({ example: '33333333-3333-4333-8333-333333333333' })
  reporterId: string;

  @ApiProperty({ example: 'alice' })
  reporterNickname: string;

  @ApiProperty({ example: '44444444-4444-4444-8444-444444444444' })
  reportedUserId: string;

  @ApiProperty({ example: 'bob' })
  reportedUserNickname: string;

  @ApiProperty({
    enum: ContentReportTargetType,
    example: ContentReportTargetType.LISTING,
  })
  targetType: ContentReportTargetType;

  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  targetId: string;

  @ApiProperty({
    enum: ContentReportReason,
    example: ContentReportReason.OBJECTIONABLE_CONTENT,
  })
  reason: ContentReportReason;

  @ApiProperty({
    example: 'Contains hate speech in the description',
    nullable: true,
  })
  details: string | null;

  @ApiProperty({
    enum: ContentReportStatus,
    example: ContentReportStatus.PENDING,
  })
  status: ContentReportStatus;

  @ApiProperty({
    example: 'Removed listing and ejected user',
    nullable: true,
  })
  adminNote: string | null;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
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
  @ApiPropertyOptional({
    enum: ContentReportStatus,
    example: ContentReportStatus.PENDING,
    description: 'Filter queue by status (omit for all)',
  })
  @IsOptional()
  @IsEnum(ContentReportStatus)
  status?: ContentReportStatus;
}

export class ActionContentReportDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Also ban (eject) the user who created the content. Defaults to true when omitted.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ejectUser?: boolean;

  @ApiPropertyOptional({
    example: 'Removed listing; zero-tolerance violation',
    maxLength: 2000,
    description: 'Internal admin note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;

  @ApiPropertyOptional({
    example: 'Thanks for reporting. We removed the content within 24 hours.',
    maxLength: 2000,
    description: 'Message sent to the reporter after action',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reporterMessage?: string;
}

export class DismissContentReportDto {
  @ApiPropertyOptional({
    example: 'Content does not violate Terms',
    maxLength: 2000,
    description: 'Internal admin note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;

  @ApiPropertyOptional({
    example: 'We reviewed your report and took no further action.',
    maxLength: 2000,
    description: 'Message sent to the reporter after dismiss',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reporterMessage?: string;
}

export class BlockUserDto {
  @ApiProperty({
    example: '44444444-4444-4444-8444-444444444444',
    description: 'User ID to block',
  })
  @IsUUID()
  blockedUserId: string;

  @ApiPropertyOptional({
    example: 'Harassment in chat',
    maxLength: 1000,
    description: 'Optional reason (also forwarded to admin notification)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class UserBlockDto {
  @ApiProperty({ example: '55555555-5555-4555-8555-555555555555' })
  id: string;

  @ApiProperty({ example: '44444444-4444-4444-8444-444444444444' })
  blockedUserId: string;

  @ApiProperty({ example: 'bob' })
  blockedNickname: string;

  @ApiProperty({ example: 'A1B2C3D4' })
  blockedReferralCode: string;

  @ApiProperty({ example: 'Harassment in chat', nullable: true })
  reason: string | null;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
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

export class UnblockUserResultDto {
  @ApiProperty({ example: '44444444-4444-4444-8444-444444444444' })
  blockedUserId: string;

  @ApiProperty({ example: true })
  unblocked: boolean;
}

export class AddFilterKeywordDto {
  @ApiProperty({
    example: 'hateword',
    minLength: 2,
    maxLength: 100,
    description:
      'Keyword blocked on listing title/description, text chat, and reviews (case-insensitive match)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  keyword: string;
}

export class ContentFilterKeywordDto {
  @ApiProperty({ example: '66666666-6666-4666-8666-666666666666' })
  id: string;

  @ApiProperty({ example: 'hateword' })
  keyword: string;

  @ApiProperty({
    example: true,
    description: 'Inactive keywords are ignored by the content filter',
  })
  isActive: boolean;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
  updatedAt: Date;

  constructor(row: ContentFilterKeywordData) {
    this.id = row.id;
    this.keyword = row.keyword;
    this.isActive = row.isActive;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}

export class DeactivateFilterKeywordResultDto {
  @ApiProperty({ example: '66666666-6666-4666-8666-666666666666' })
  keywordId: string;

  @ApiProperty({
    example: true,
    description: 'False if the keyword id was not found',
  })
  deactivated: boolean;
}
