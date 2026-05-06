import { ApiProperty } from '@nestjs/swagger';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import type { PublicUserProfileData } from '../../../domain/repositories/points.repository.interface.js';

export class PublicUserProfileDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty({ nullable: true })
  avatar: string | null;

  @ApiProperty({ nullable: true })
  region: string | null;

  @ApiProperty({ enum: RankTier })
  currentRank: RankTier;

  @ApiProperty({ example: 4.6 })
  averageStars: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  completedSales: number;

  @ApiProperty()
  completedPurchases: number;

  @ApiProperty()
  memberSince: Date;

  constructor(data: PublicUserProfileData) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.avatar = data.avatar;
    this.region = data.region;
    this.currentRank = data.currentRank;
    this.averageStars = data.averageStars;
    this.totalReviews = data.totalReviews;
    this.completedSales = data.completedSales;
    this.completedPurchases = data.completedPurchases;
    this.memberSince = data.memberSince;
  }
}
