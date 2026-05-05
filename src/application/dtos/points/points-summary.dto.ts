import { ApiProperty } from '@nestjs/swagger';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import type {
  RankConfigData,
  UserPointsSummaryData,
} from '../../../domain/repositories/points.repository.interface.js';

export class RankConfigResponseDto {
  @ApiProperty({ enum: RankTier })
  tier: RankTier;

  @ApiProperty()
  minPoints: number;

  @ApiProperty({ nullable: true })
  maxPoints: number | null;

  @ApiProperty()
  label: string;

  @ApiProperty({ nullable: true })
  badgeUrl: string | null;

  @ApiProperty()
  sortOrder: number;

  constructor(data: RankConfigData) {
    this.tier = data.tier;
    this.minPoints = data.minPoints;
    this.maxPoints = data.maxPoints;
    this.label = data.label;
    this.badgeUrl = data.badgeUrl;
    this.sortOrder = data.sortOrder;
  }
}

export class PointsSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  totalPoints: number;

  @ApiProperty()
  availableWithdrawalPoints: number;

  @ApiProperty({ enum: RankTier })
  currentRank: RankTier;

  @ApiProperty({ type: RankConfigResponseDto, nullable: true })
  currentRankConfig: RankConfigResponseDto | null;

  @ApiProperty({ type: RankConfigResponseDto, nullable: true })
  nextRankConfig: RankConfigResponseDto | null;

  @ApiProperty()
  pendingWithdrawalAmount: number;

  constructor(data: UserPointsSummaryData) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.totalPoints = data.totalPoints;
    this.availableWithdrawalPoints = data.availableWithdrawalPoints;
    this.currentRank = data.currentRank;
    this.currentRankConfig = data.currentRankConfig
      ? new RankConfigResponseDto(data.currentRankConfig)
      : null;
    this.nextRankConfig = data.nextRankConfig
      ? new RankConfigResponseDto(data.nextRankConfig)
      : null;
    this.pendingWithdrawalAmount = data.pendingWithdrawalAmount;
  }
}
