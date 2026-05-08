import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { RankTier } from '../../domain/enums/rank-tier.enum.js';
import { WithdrawalStatus } from '../../domain/enums/withdrawal-status.enum.js';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum.js';
import type {
  AdminMarkWithdrawalPaidData,
  AdminRejectWithdrawalData,
  CreateReviewData,
  CreateWithdrawalRequestData,
  IPointsRepository,
  PublicUserProfileData,
  RankConfigData,
  ReviewData,
  StarPointConfigData,
  TransactionReviewContextData,
  UserPointsSummaryData,
  UserTransactionStatsData,
  WithdrawalRequestData,
} from '../../domain/repositories/points.repository.interface.js';

const {
  NotificationType,
  PointSourceType,
  TransactionStatus: PrismaTransactionStatus,
  WithdrawalStatus: PrismaWithdrawalStatus,
} = PrismaPkg;

const DEFAULT_STAR_POINT_CONFIGS: StarPointConfigData[] = [
  { starCount: 1, pointsAwarded: 1 },
  { starCount: 2, pointsAwarded: 2 },
  { starCount: 3, pointsAwarded: 3 },
  { starCount: 4, pointsAwarded: 4 },
  { starCount: 5, pointsAwarded: 5 },
];

const DEFAULT_RANK_CONFIGS: RankConfigData[] = [
  {
    tier: RankTier.NEWBIE,
    minPoints: 0,
    maxPoints: 99,
    label: 'Newbie',
    badgeUrl: null,
    sortOrder: 1,
  },
  {
    tier: RankTier.BRONZE,
    minPoints: 100,
    maxPoints: 299,
    label: 'Bronze',
    badgeUrl: null,
    sortOrder: 2,
  },
  {
    tier: RankTier.SILVER,
    minPoints: 300,
    maxPoints: 699,
    label: 'Silver',
    badgeUrl: null,
    sortOrder: 3,
  },
  {
    tier: RankTier.GOLD,
    minPoints: 700,
    maxPoints: 1499,
    label: 'Gold',
    badgeUrl: null,
    sortOrder: 4,
  },
  {
    tier: RankTier.VIP,
    minPoints: 1500,
    maxPoints: null,
    label: 'VIP',
    badgeUrl: null,
    sortOrder: 5,
  },
];

@Injectable()
export class PointsRepository implements IPointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPointsSummary(
    userId: string,
  ): Promise<UserPointsSummaryData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        totalPoints: true,
        currentRank: true,
      },
    });
    if (!user) {
      return null;
    }

    const pendingWithdrawalAmount =
      await this.getPendingWithdrawalAmount(userId);
    const rankConfigs = await this.getRankConfigs();
    const sorted = this.sortRankConfigs(rankConfigs);
    const currentRankConfig =
      this.findRankConfigForPoints(sorted, user.totalPoints) ?? null;
    const nextRankConfig =
      sorted.find((config) => config.minPoints > user.totalPoints) ?? null;

    return {
      userId: user.id,
      nickname: user.nickname,
      totalPoints: user.totalPoints,
      availableWithdrawalPoints: Math.max(
        user.totalPoints - pendingWithdrawalAmount,
        0,
      ),
      currentRank: user.currentRank as RankTier,
      currentRankConfig,
      nextRankConfig,
      pendingWithdrawalAmount,
    };
  }

  async getUserTransactionStats(
    userId: string,
  ): Promise<UserTransactionStatsData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return null;
    }

    const [totalTransactionsMade, completedSales, completedPurchases] =
      await Promise.all([
        this.prisma.transaction.count({
          where: {
            OR: [{ buyerId: userId }, { sellerId: userId }],
          },
        }),
        this.prisma.transaction.count({
          where: {
            sellerId: userId,
            status: PrismaTransactionStatus.COMPLETED,
          },
        }),
        this.prisma.transaction.count({
          where: {
            buyerId: userId,
            status: PrismaTransactionStatus.COMPLETED,
          },
        }),
      ]);

    return {
      userId,
      totalTransactionsMade,
      completedSales,
      completedPurchases,
    };
  }

  async getPublicUserProfile(
    userId: string,
  ): Promise<PublicUserProfileData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        currentRank: true,
        createdAt: true,
        profile: {
          select: {
            avatar: true,
            inputRegion: true,
          },
        },
      },
    });
    if (!user) {
      return null;
    }

    const [reviewAggregate, completedSales, completedPurchases] =
      await Promise.all([
        this.prisma.review.aggregate({
          where: { revieweeId: userId },
          _avg: { stars: true },
          _count: { stars: true },
        }),
        this.prisma.transaction.count({
          where: {
            sellerId: userId,
            status: PrismaTransactionStatus.COMPLETED,
          },
        }),
        this.prisma.transaction.count({
          where: {
            buyerId: userId,
            status: PrismaTransactionStatus.COMPLETED,
          },
        }),
      ]);

    return {
      userId: user.id,
      nickname: user.nickname,
      avatar: user.profile?.avatar ?? null,
      region: user.profile?.inputRegion ?? null,
      currentRank: user.currentRank as RankTier,
      averageStars: Number(reviewAggregate._avg.stars ?? 0),
      totalReviews: reviewAggregate._count.stars ?? 0,
      completedSales,
      completedPurchases,
      memberSince: user.createdAt,
    };
  }

  async getStarPointConfigs(): Promise<StarPointConfigData[]> {
    const rows = await this.prisma.starPointConfig.findMany({
      orderBy: { starCount: 'asc' },
    });
    if (rows.length === 0) {
      return DEFAULT_STAR_POINT_CONFIGS;
    }

    return rows.map((row) => ({
      starCount: row.starCount,
      pointsAwarded: row.pointsAwarded,
    }));
  }

  async upsertStarPointConfigs(
    configs: StarPointConfigData[],
  ): Promise<StarPointConfigData[]> {
    await this.prisma.$transaction(
      configs.map((config) =>
        this.prisma.starPointConfig.upsert({
          where: { starCount: config.starCount },
          update: { pointsAwarded: config.pointsAwarded },
          create: {
            starCount: config.starCount,
            pointsAwarded: config.pointsAwarded,
          },
        }),
      ),
    );

    return this.getStarPointConfigs();
  }

  async getRankConfigs(): Promise<RankConfigData[]> {
    const rows = await this.prisma.rankConfig.findMany({
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

  async upsertRankConfigs(
    configs: RankConfigData[],
  ): Promise<RankConfigData[]> {
    await this.prisma.$transaction(
      configs.map((config) =>
        this.prisma.rankConfig.upsert({
          where: { tier: config.tier },
          update: {
            minPoints: config.minPoints,
            maxPoints: config.maxPoints,
            label: config.label,
            badgeUrl: config.badgeUrl,
            sortOrder: config.sortOrder,
          },
          create: {
            tier: config.tier,
            minPoints: config.minPoints,
            maxPoints: config.maxPoints,
            label: config.label,
            badgeUrl: config.badgeUrl,
            sortOrder: config.sortOrder,
          },
        }),
      ),
    );

    return this.getRankConfigs();
  }

  async findTransactionReviewContext(
    transactionId: string,
  ): Promise<TransactionReviewContextData | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        buyerId: true,
        sellerId: true,
      },
    });
    if (!transaction) {
      return null;
    }

    return {
      id: transaction.id,
      status: transaction.status as TransactionStatus,
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
    };
  }

  async hasReview(transactionId: string, reviewerId: string): Promise<boolean> {
    const count = await this.prisma.review.count({
      where: { transactionId, reviewerId },
    });
    return count > 0;
  }

  async createReviewAndAwardPoints(
    data: CreateReviewData,
  ): Promise<ReviewData> {
    const starConfigs = await this.getStarPointConfigs();
    const rankConfigs = await this.getRankConfigs();
    const pointsAwarded =
      starConfigs.find((config) => config.starCount === data.stars)
        ?.pointsAwarded ?? data.stars;

    const review = await this.prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          transactionId: data.transactionId,
          reviewerId: data.reviewerId,
          revieweeId: data.revieweeId,
          stars: data.stars,
          comment: data.comment,
          pointsAwarded,
        },
      });

      const reviewee = await tx.user.findUnique({
        where: { id: data.revieweeId },
        select: { totalPoints: true },
      });
      if (!reviewee) {
        throw new NotFoundException('Reviewee not found');
      }

      const nextBalance = reviewee.totalPoints + pointsAwarded;
      await tx.user.update({
        where: { id: data.revieweeId },
        data: {
          totalPoints: nextBalance,
          currentRank: this.findRankTierForPoints(rankConfigs, nextBalance),
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId: data.revieweeId,
          amount: pointsAwarded,
          sourceType: PointSourceType.REVIEW_RECEIVED,
          sourceId: createdReview.id,
          description: `${data.stars}-star review received`,
          balanceAfter: nextBalance,
        },
      });

      await tx.notification.create({
        data: {
          userId: data.revieweeId,
          type: NotificationType.POINTS_RECEIVED,
          title: 'Points received',
          message: `You received ${pointsAwarded} points from a ${data.stars}-star review.`,
          referenceId: createdReview.id,
        },
      });

      return createdReview;
    });

    return this.mapReview(review);
  }

  async createWithdrawalRequest(
    data: CreateWithdrawalRequestData,
  ): Promise<WithdrawalRequestData> {
    const row = await this.prisma.withdrawalRequest.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        status: PrismaWithdrawalStatus.PENDING,
      },
      include: WITHDRAWAL_INCLUDE,
    });

    await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: NotificationType.WITHDRAWAL,
        title: 'Withdrawal requested',
        message:
          'Your point withdrawal request was submitted and is waiting for admin review.',
        referenceId: row.id,
      },
    });

    return this.mapWithdrawal(row);
  }

  async findUserWithdrawalRequests(
    userId: string,
  ): Promise<WithdrawalRequestData[]> {
    const rows = await this.prisma.withdrawalRequest.findMany({
      where: { userId },
      include: WITHDRAWAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.mapWithdrawal(row));
  }

  async findWithdrawalRequests(
    status?: WithdrawalStatus,
  ): Promise<WithdrawalRequestData[]> {
    const rows = await this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      include: WITHDRAWAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.mapWithdrawal(row));
  }

  async approveWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminNote?: string,
  ): Promise<WithdrawalRequestData> {
    const rankConfigs = await this.getRankConfigs();

    const row = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        include: WITHDRAWAL_INCLUDE,
      });
      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }
      if (withdrawal.status !== PrismaWithdrawalStatus.PENDING) {
        throw new ConflictException('Only pending withdrawals can be approved');
      }
      if (withdrawal.user.totalPoints < withdrawal.amount) {
        throw new BadRequestException('User does not have enough points');
      }

      const nextBalance = withdrawal.user.totalPoints - withdrawal.amount;
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: {
          totalPoints: nextBalance,
          currentRank: this.findRankTierForPoints(rankConfigs, nextBalance),
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId: withdrawal.userId,
          amount: -withdrawal.amount,
          sourceType: PointSourceType.WITHDRAWAL,
          sourceId: withdrawal.id,
          description: 'Point withdrawal approved',
          balanceAfter: nextBalance,
        },
      });

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: PrismaWithdrawalStatus.APPROVED,
          adminNote: adminNote ?? null,
          processedById: adminId,
          processedAt: new Date(),
        },
        include: WITHDRAWAL_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: NotificationType.WITHDRAWAL,
          title: 'Withdrawal approved',
          message:
            'Your withdrawal was approved. Admin will transfer money by KBZPay manually.',
          referenceId: withdrawal.id,
        },
      });

      return updated;
    });

    return this.mapWithdrawal(row);
  }

  async rejectWithdrawal(
    data: AdminRejectWithdrawalData,
  ): Promise<WithdrawalRequestData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: data.withdrawalId },
      });
      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }
      if (withdrawal.status !== PrismaWithdrawalStatus.PENDING) {
        throw new ConflictException('Only pending withdrawals can be rejected');
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: data.withdrawalId },
        data: {
          status: PrismaWithdrawalStatus.REJECTED,
          adminNote: data.adminNote ?? null,
          processedById: data.adminId,
          processedAt: new Date(),
        },
        include: WITHDRAWAL_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: NotificationType.WITHDRAWAL,
          title: 'Withdrawal rejected',
          message:
            data.adminNote ?? 'Your withdrawal request was rejected by admin.',
          referenceId: withdrawal.id,
        },
      });

      return updated;
    });

    return this.mapWithdrawal(row);
  }

  async markWithdrawalPaid(
    data: AdminMarkWithdrawalPaidData,
  ): Promise<WithdrawalRequestData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: data.withdrawalId },
      });
      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }
      if (withdrawal.status !== PrismaWithdrawalStatus.APPROVED) {
        throw new ConflictException('Only approved withdrawals can be paid');
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: data.withdrawalId },
        data: {
          status: PrismaWithdrawalStatus.TRANSFERRED,
          kbzTransferRef: data.kbzTransferRef,
          adminNote: data.adminNote ?? withdrawal.adminNote,
          processedById: data.adminId,
          processedAt: new Date(),
        },
        include: WITHDRAWAL_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: NotificationType.WITHDRAWAL,
          title: 'Withdrawal paid',
          message: `Admin sent your KBZPay withdrawal. Transaction number: ${data.kbzTransferRef}`,
          referenceId: withdrawal.id,
        },
      });

      return updated;
    });

    return this.mapWithdrawal(row);
  }

  private async getPendingWithdrawalAmount(userId: string): Promise<number> {
    const aggregate = await this.prisma.withdrawalRequest.aggregate({
      where: {
        userId,
        status: PrismaWithdrawalStatus.PENDING,
      },
      _sum: { amount: true },
    });

    return aggregate._sum.amount ?? 0;
  }

  private findRankTierForPoints(
    configs: RankConfigData[],
    points: number,
  ): RankTier {
    return (
      this.findRankConfigForPoints(this.sortRankConfigs(configs), points)
        ?.tier ?? RankTier.NEWBIE
    );
  }

  private findRankConfigForPoints(
    configs: RankConfigData[],
    points: number,
  ): RankConfigData | undefined {
    return configs.find(
      (config) =>
        points >= config.minPoints &&
        (config.maxPoints === null || points <= config.maxPoints),
    );
  }

  private sortRankConfigs(configs: RankConfigData[]): RankConfigData[] {
    return [...configs].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.minPoints - b.minPoints,
    );
  }

  private mapReview(row: {
    id: string;
    transactionId: string;
    reviewerId: string;
    revieweeId: string;
    stars: number;
    comment: string | null;
    pointsAwarded: number;
    createdAt: Date;
  }): ReviewData {
    return {
      id: row.id,
      transactionId: row.transactionId,
      reviewerId: row.reviewerId,
      revieweeId: row.revieweeId,
      stars: row.stars,
      comment: row.comment,
      pointsAwarded: row.pointsAwarded,
      createdAt: row.createdAt,
    };
  }

  private mapWithdrawal(row: WithdrawalRow): WithdrawalRequestData {
    return {
      id: row.id,
      userId: row.userId,
      nickname: row.user.nickname,
      phone: row.user.phone,
      kbzPayAccountName: row.user.kbzPayAccount?.accountName ?? null,
      kbzPayPhoneNumber: row.user.kbzPayAccount?.phoneNumber ?? null,
      amount: row.amount,
      status: row.status as WithdrawalStatus,
      adminNote: row.adminNote,
      processedById: row.processedById,
      processedAt: row.processedAt,
      kbzTransferRef: row.kbzTransferRef,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

const WITHDRAWAL_INCLUDE = {
  user: {
    select: {
      nickname: true,
      phone: true,
      totalPoints: true,
      kbzPayAccount: {
        select: {
          accountName: true,
          phoneNumber: true,
        },
      },
    },
  },
} as const;

type WithdrawalRow = {
  id: string;
  userId: string;
  user: {
    nickname: string;
    phone: string;
    totalPoints: number;
    kbzPayAccount: {
      accountName: string;
      phoneNumber: string;
    } | null;
  };
  amount: number;
  status: string;
  adminNote: string | null;
  processedById: string | null;
  processedAt: Date | null;
  kbzTransferRef: string | null;
  createdAt: Date;
  updatedAt: Date;
};
