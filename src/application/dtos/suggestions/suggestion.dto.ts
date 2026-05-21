import { ApiProperty } from '@nestjs/swagger';
import { SuggestionStatus } from '../../../domain/enums/suggestion-status.enum.js';
import type { SuggestionData } from '../../../domain/repositories/suggestion.repository.interface.js';

export class SuggestionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ description: 'Account nickname at time of listing' })
  userNickname: string;

  @ApiProperty()
  userPhone: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  details: string;

  @ApiProperty({ enum: SuggestionStatus })
  status: SuggestionStatus;

  @ApiProperty()
  pointsAwarded: number;

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

  constructor(data: SuggestionData) {
    this.id = data.id;
    this.userId = data.userId;
    this.userNickname = data.userNickname;
    this.userPhone = data.userPhone;
    this.nickname = data.nickname;
    this.name = data.name;
    this.details = data.details;
    this.status = data.status;
    this.pointsAwarded = data.pointsAwarded;
    this.adminNote = data.adminNote;
    this.reviewedById = data.reviewedById;
    this.reviewedAt = data.reviewedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
