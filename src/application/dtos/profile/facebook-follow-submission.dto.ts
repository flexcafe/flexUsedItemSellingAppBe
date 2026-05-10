import { ApiProperty } from '@nestjs/swagger';
import { FacebookFollowSubmissionStatus } from '../../../domain/enums/facebook-follow-submission-status.enum.js';
import type { FacebookFollowSubmissionData } from '../../../domain/repositories/facebook.repository.interface.js';

export class FacebookFollowSubmissionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  userNickname: string;

  @ApiProperty()
  userPhone: string;

  @ApiProperty()
  facebookName: string;

  @ApiProperty()
  facebookProfileUrl: string;

  @ApiProperty()
  facebookPageUrl: string;

  @ApiProperty()
  screenshotUrl: string;

  @ApiProperty({ enum: FacebookFollowSubmissionStatus })
  status: FacebookFollowSubmissionStatus;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  @ApiProperty({ nullable: true })
  reviewedById: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(data: FacebookFollowSubmissionData) {
    this.id = data.id;
    this.userId = data.userId;
    this.userNickname = data.userNickname;
    this.userPhone = data.userPhone;
    this.facebookName = data.facebookName;
    this.facebookProfileUrl = data.facebookProfileUrl;
    this.facebookPageUrl = data.facebookPageUrl;
    this.screenshotUrl = data.screenshotUrl;
    this.status = data.status;
    this.adminNote = data.adminNote;
    this.reviewedById = data.reviewedById;
    this.reviewedAt = data.reviewedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
