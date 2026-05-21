import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { SuggestionStatus } from '../../domain/enums/suggestion-status.enum.js';
import { RankTier } from '../../domain/enums/rank-tier.enum.js';
import type {
  CreateSuggestionData,
  DismissSuggestionData,
  ISuggestionRepository,
  RewardSuggestionData,
  SuggestionData,
} from '../../domain/repositories/suggestion.repository.interface.js';
import type { RankConfigData } from '../../domain/repositories/points.repository.interface.js';

const {
  SuggestionStatus: PrismaSuggestionStatus,
  PointSourceType: PrismaPointSourceType,
} = PrismaPkg;

const SUGGESTION_USER_SELECT = {
  id: true,
  nickname: true,
  phone: true,
} as const;

const DEFAULT_RANK_CONFIGS: RankConfigData[] = [
  { tier: RankTier.NEWBIE, minPoints: 0, maxPoints: 99, label: 'Newbie', badgeUrl: null, sortOrder: 1 },
  { tier: RankTier.BRONZE, minPoints: 100, maxPoints: 299, label: 'Bronze', badgeUrl: null, sortOrder: 2 },
  { tier: RankTier.SILVER, minPoints: 300, maxPoints: 699, label: 'Silver', badgeUrl: null, sortOrder: 3 },
  { tier: RankTier.GOLD, minPoints: 700, maxPoints: 1499, label: 'Gold', badgeUrl: null, sortOrder: 4 },
  { tier: RankTier.VIP, minPoints: 1500, maxPoints: null, label: 'VIP', badgeUrl: null, sortOrder: 5 },
];

@Injectable()
export class SuggestionRepository implements ISuggestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSuggestionData): Promise<SuggestionData> {
    const row = await this.prisma.suggestion.create({
      data: {
        userId: data.userId,
        nickname: data.nickname,
        name: data.name,
        details: data.details,
        status: PrismaSuggestionStatus.PENDING,
      },
      include: { user: { select: SUGGESTION_USER_SELECT } },
    });
    return this.map(row);
  }

  async findById(id: string): Promise<SuggestionData | null> {
    const row = await this.prisma.suggestion.findUnique({
      where: { id },
      include: { user: { select: SUGGESTION_USER_SELECT } },
    });
    return row ? this.map(row) : null;
  }

  async listByUserId(userId: string): Promise<SuggestionData[]> {
    const rows = await this.prisma.suggestion.findMany({
      where: { userId },
      include: { user: { select: SUGGESTION_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.map(row));
  }

  async listForAdmin(status?: SuggestionStatus): Promise<SuggestionData[]> {
    const rows = await this.prisma.suggestion.findMany({
      where: status
        ? { status: status as unknown as PrismaPkg.SuggestionStatus }
        : undefined,
      include: { user: { select: SUGGESTION_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.map(row));
  }

  async rewardWithPoints(data: RewardSuggestionData): Promise<SuggestionData> {
    if (data.points < 1) {
      throw new BadRequestException('Points must be at least 1');
    }
    if (data.points > 10_000) {
      throw new BadRequestException('Points cannot exceed 10000');
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const suggestion = await tx.suggestion.findUnique({
        where: { id: data.suggestionId },
        include: { user: { select: SUGGESTION_USER_SELECT } },
      });
      if (!suggestion) {
        throw new NotFoundException('Suggestion not found');
      }
      if (suggestion.status !== PrismaSuggestionStatus.PENDING) {
        throw new ConflictException('Only pending suggestions can be rewarded');
      }

      const user = await tx.user.findUnique({
        where: { id: suggestion.userId },
        select: { totalPoints: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const rankConfigs = await this.loadRankConfigs(tx);
      const nextBalance = user.totalPoints + data.points;

      await tx.user.update({
        where: { id: suggestion.userId },
        data: {
          totalPoints: nextBalance,
          currentRank: this.findRankTierForPoints(rankConfigs, nextBalance),
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId: suggestion.userId,
          amount: data.points,
          sourceType: PrismaPointSourceType.SUGGESTION_REWARD,
          sourceId: suggestion.id,
          description: 'Suggestion reward',
          balanceAfter: nextBalance,
        },
      });

      return tx.suggestion.update({
        where: { id: data.suggestionId },
        data: {
          status: PrismaSuggestionStatus.REWARDED,
          pointsAwarded: data.points,
          adminNote: data.adminNote ?? null,
          reviewedById: data.adminId,
          reviewedAt: new Date(),
        },
        include: { user: { select: SUGGESTION_USER_SELECT } },
      });
    });

    return this.map(row);
  }

  async dismiss(data: DismissSuggestionData): Promise<SuggestionData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const suggestion = await tx.suggestion.findUnique({
        where: { id: data.suggestionId },
      });
      if (!suggestion) {
        throw new NotFoundException('Suggestion not found');
      }
      if (suggestion.status !== PrismaSuggestionStatus.PENDING) {
        throw new ConflictException('Only pending suggestions can be dismissed');
      }

      return tx.suggestion.update({
        where: { id: data.suggestionId },
        data: {
          status: PrismaSuggestionStatus.DISMISSED,
          adminNote: data.adminNote ?? null,
          reviewedById: data.adminId,
          reviewedAt: new Date(),
        },
        include: { user: { select: SUGGESTION_USER_SELECT } },
      });
    });

    return this.map(row);
  }

  private async loadRankConfigs(
    tx: PrismaPkg.Prisma.TransactionClient,
  ): Promise<RankConfigData[]> {
    const rows = await tx.rankConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { minPoints: 'asc' }],
    });
    if (rows.length === 0) {
      return DEFAULT_RANK_CONFIGS;
    }
    return rows.map((row) => ({
      tier: row.tier as RankTier,
      minPoints: row.minPoints,
      maxPoints: row.maxPoints,
      label: row.label,
      badgeUrl: row.badgeUrl,
      sortOrder: row.sortOrder,
    }));
  }

  private findRankTierForPoints(
    configs: RankConfigData[],
    points: number,
  ): RankTier {
    const sorted = [...configs].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.minPoints - b.minPoints,
    );
    const match = sorted.find(
      (config) =>
        points >= config.minPoints &&
        (config.maxPoints === null || points <= config.maxPoints),
    );
    return match?.tier ?? RankTier.NEWBIE;
  }

  private map(
    row: PrismaPkg.Suggestion & {
      user: { id: string; nickname: string; phone: string };
    },
  ): SuggestionData {
    return {
      id: row.id,
      userId: row.userId,
      userNickname: row.user.nickname,
      userPhone: row.user.phone,
      nickname: row.nickname,
      name: row.name,
      details: row.details,
      status: row.status as SuggestionStatus,
      pointsAwarded: row.pointsAwarded,
      adminNote: row.adminNote,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
