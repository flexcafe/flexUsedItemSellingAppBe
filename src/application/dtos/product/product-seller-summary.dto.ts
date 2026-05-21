import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import type { PublicUserProfileData } from '../../../domain/repositories/points.repository.interface.js';

/** Seller trust card embedded on public product detail. */
export class ProductSellerSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickname: string;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;

  @ApiProperty({ enum: RankTier })
  currentRank: RankTier;

  @ApiProperty({ example: 4.6 })
  averageStars: number;

  @ApiProperty({ example: 12 })
  totalReviews: number;

  @ApiProperty({
    example: 'A1B2C3D4',
    description: 'Seller invite code (registration referralId)',
  })
  referralCode: string;

  constructor(data: PublicUserProfileData) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.avatar = data.avatar;
    this.currentRank = data.currentRank;
    this.averageStars = data.averageStars;
    this.totalReviews = data.totalReviews;
    this.referralCode = data.referralCode;
  }
}
