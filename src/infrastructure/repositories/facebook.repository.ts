import { Injectable } from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import {
  type CreateFacebookFollowSubmissionData,
  type FacebookFollowSubmissionData,
  type IFacebookRepository,
  type LinkFacebookData,
  type ReviewFacebookFollowSubmissionData,
} from '../../domain/repositories/facebook.repository.interface.js';
import { FacebookFollowSubmissionStatus } from '../../domain/enums/facebook-follow-submission-status.enum.js';
import { RankTier } from '../../domain/enums/rank-tier.enum.js';

const { PointSourceType: PrismaPointSourceType } = PrismaPkg;

type FacebookSubmissionRow = Prisma.FacebookFollowSubmissionGetPayload<{
  include: {
    user: {
      select: {
        nickname: true;
        phone: true;
      };
    };
  };
}>;

type RankConfigData = {
  tier: RankTier;
  minPoints: number;
  maxPoints: number | null;
  sortOrder: number;
};

const DEFAULT_RANK_CONFIGS: RankConfigData[] = [
  { tier: RankTier.NEWBIE, minPoints: 0, maxPoints: 99, sortOrder: 1 },
  { tier: RankTier.BRONZE, minPoints: 100, maxPoints: 299, sortOrder: 2 },
  { tier: RankTier.SILVER, minPoints: 300, maxPoints: 699, sortOrder: 3 },
  { tier: RankTier.GOLD, minPoints: 700, maxPoints: 1499, sortOrder: 4 },
  { tier: RankTier.VIP, minPoints: 1500, maxPoints: null, sortOrder: 5 },
];

@Injectable()
export class FacebookRepository implements IFacebookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setFacebookLink(data: LinkFacebookData): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: data.userId },
        data: { facebookId: data.facebookId },
      }),
      this.prisma.userProfile.update({
        where: { userId: data.userId },
        data: {
          facebookName: data.facebookName,
          facebookProfileUrl: data.facebookProfileUrl,
          facebookLinkedAt: new Date(),
        },
      }),
    ]);
  }

  async createFacebookFollowSubmission(
    data: CreateFacebookFollowSubmissionData,
  ): Promise<FacebookFollowSubmissionData> {
    const row = await this.prisma.facebookFollowSubmission.create({
      data: {
        userId: data.userId,
        facebookName: data.facebookName,
        facebookProfileUrl: data.facebookProfileUrl,
        facebookPageUrl: data.facebookPageUrl,
        screenshotUrl: data.screenshotUrl,
      },
      include: FACEBOOK_SUBMISSION_INCLUDE,
    });

    return this.mapSubmission(row);
  }

  async findLatestFacebookFollowSubmissionByUserId(
    userId: string,
  ): Promise<FacebookFollowSubmissionData | null> {
    const row = await this.prisma.facebookFollowSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: FACEBOOK_SUBMISSION_INCLUDE,
    });
    return row ? this.mapSubmission(row) : null;
  }

  async findFacebookFollowSubmissionById(
    submissionId: string,
  ): Promise<FacebookFollowSubmissionData | null> {
    const row = await this.prisma.facebookFollowSubmission.findUnique({
      where: { id: submissionId },
      include: FACEBOOK_SUBMISSION_INCLUDE,
    });
    return row ? this.mapSubmission(row) : null;
  }

  async listFacebookFollowSubmissions(
    status?: FacebookFollowSubmissionStatus,
  ): Promise<FacebookFollowSubmissionData[]> {
    const rows = await this.prisma.facebookFollowSubmission.findMany({
      where: status ? { status } : undefined,
      include: FACEBOOK_SUBMISSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapSubmission(row));
  }

  async reviewFacebookFollowSubmission(
    data: ReviewFacebookFollowSubmissionData,
  ): Promise<FacebookFollowSubmissionData> {
    const row = await this.prisma.facebookFollowSubmission.update({
      where: { id: data.submissionId },
      data: {
        status: data.status,
        adminNote: data.adminNote ?? null,
        reviewedById: data.adminId,
        reviewedAt: new Date(),
      },
      include: FACEBOOK_SUBMISSION_INCLUDE,
    });
    return this.mapSubmission(row);
  }

  async grantFacebookFollowRewardIfEligible(params: {
    userId: string;
    submissionId: string;
    points: number;
  }): Promise<{
    rewarded: boolean;
    newTotalPoints: number | null;
    newRank: RankTier | null;
  }> {
    let rewarded = false;
    let newTotalPoints: number | null = null;
    let newRank: RankTier | null = null;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.pointTransaction.findFirst({
        where: {
          userId: params.userId,
          sourceType: PrismaPointSourceType.FACEBOOK_FOLLOW_REWARD,
        },
        select: { id: true },
      });
      if (existing) {
        return;
      }

      const user = await tx.user.findUnique({
        where: { id: params.userId },
        select: { totalPoints: true },
      });
      if (!user) {
        return;
      }

      const rankConfigs = await tx.rankConfig.findMany({
        orderBy: [{ sortOrder: 'asc' }, { minPoints: 'asc' }],
      });
      const mappedConfigs =
        rankConfigs.length > 0
          ? rankConfigs.map((row) => ({
              tier: row.tier as RankTier,
              minPoints: row.minPoints,
              maxPoints: row.maxPoints,
              sortOrder: row.sortOrder,
            }))
          : DEFAULT_RANK_CONFIGS;

      const nextBalance = user.totalPoints + params.points;
      const nextRank = this.findRankTierForPoints(mappedConfigs, nextBalance);

      await tx.user.update({
        where: { id: params.userId },
        data: {
          totalPoints: nextBalance,
          currentRank: nextRank,
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId: params.userId,
          amount: params.points,
          sourceType: PrismaPointSourceType.FACEBOOK_FOLLOW_REWARD,
          sourceId: params.submissionId,
          description: 'Facebook page follow reward',
          balanceAfter: nextBalance,
        },
      });

      rewarded = true;
      newTotalPoints = nextBalance;
      newRank = nextRank;
    });

    return { rewarded, newTotalPoints, newRank };
  }

  private findRankTierForPoints(configs: RankConfigData[], points: number): RankTier {
    const sorted = [...configs].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.minPoints - b.minPoints,
    );
    return (
      sorted.find(
        (config) =>
          points >= config.minPoints &&
          (config.maxPoints === null || points <= config.maxPoints),
      )?.tier ?? RankTier.NEWBIE
    );
  }

  private mapSubmission(row: FacebookSubmissionRow): FacebookFollowSubmissionData {
    return {
      id: row.id,
      userId: row.userId,
      userNickname: row.user.nickname,
      userPhone: row.user.phone,
      facebookName: row.facebookName,
      facebookProfileUrl: row.facebookProfileUrl,
      facebookPageUrl: row.facebookPageUrl,
      screenshotUrl: row.screenshotUrl,
      status: row.status as FacebookFollowSubmissionStatus,
      adminNote: row.adminNote,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

const FACEBOOK_SUBMISSION_INCLUDE = {
  user: {
    select: {
      nickname: true,
      phone: true,
    },
  },
} as const;
