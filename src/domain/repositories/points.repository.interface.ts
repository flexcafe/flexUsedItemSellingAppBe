import { RankTier } from '../enums/rank-tier.enum.js';
import { PointSourceType } from '../enums/point-source-type.enum.js';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum.js';
import { TransactionStatus } from '../enums/transaction-status.enum.js';

export interface RankConfigData {
  tier: RankTier;
  minPoints: number;
  maxPoints: number | null;
  label: string;
  badgeUrl: string | null;
  sortOrder: number;
}

export interface StarPointConfigData {
  starCount: number;
  pointsAwarded: number;
}

export interface UserPointsSummaryData {
  userId: string;
  nickname: string;
  totalPoints: number;
  availableWithdrawalPoints: number;
  currentRank: RankTier;
  currentRankConfig: RankConfigData | null;
  nextRankConfig: RankConfigData | null;
  pendingWithdrawalAmount: number;
}

export interface UserTransactionStatsData {
  userId: string;
  totalTransactionsMade: number;
  completedSales: number;
  completedPurchases: number;
}

export interface PublicUserProfileData {
  userId: string;
  nickname: string;
  avatar: string | null;
  region: string | null;
  currentRank: RankTier;
  averageStars: number;
  totalReviews: number;
  completedSales: number;
  completedPurchases: number;
  memberSince: Date;
}

export interface WithdrawalRequestData {
  id: string;
  userId: string;
  nickname: string;
  phone: string;
  kbzPayAccountName: string | null;
  kbzPayPhoneNumber: string | null;
  amount: number;
  status: WithdrawalStatus;
  adminNote: string | null;
  processedById: string | null;
  processedAt: Date | null;
  kbzTransferRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewData {
  id: string;
  transactionId: string;
  reviewerId: string;
  revieweeId: string;
  stars: number;
  comment: string | null;
  pointsAwarded: number;
  createdAt: Date;
}

export interface ReviewStarCountData {
  stars: number;
  count: number;
}

export interface SellerReviewListItemData {
  id: string;
  stars: number;
  comment: string | null;
  reviewerNickname: string;
  reviewerAvatar: string | null;
  createdAt: Date;
}

export interface SellerReviewsResultData {
  starBreakdown: ReviewStarCountData[];
  items: SellerReviewListItemData[];
  total: number;
}

export interface TransactionReviewContextData {
  id: string;
  status: TransactionStatus;
  buyerId: string;
  sellerId: string;
}

export interface CreateReviewData {
  transactionId: string;
  reviewerId: string;
  revieweeId: string;
  stars: number;
  comment?: string;
}

export interface CreateWithdrawalRequestData {
  userId: string;
  amount: number;
}

export interface AdminRejectWithdrawalData {
  withdrawalId: string;
  adminId: string;
  adminNote?: string;
}

export interface AdminMarkWithdrawalPaidData {
  withdrawalId: string;
  adminId: string;
  kbzTransferRef: string;
  adminNote?: string;
}

export interface IPointsRepository {
  getUserPointsSummary(userId: string): Promise<UserPointsSummaryData | null>;
  getUserTransactionStats(
    userId: string,
  ): Promise<UserTransactionStatsData | null>;
  getPublicUserProfile(userId: string): Promise<PublicUserProfileData | null>;
  getSellerReviews(
    revieweeId: string,
    skip: number,
    take: number,
  ): Promise<SellerReviewsResultData | null>;
  getStarPointConfigs(): Promise<StarPointConfigData[]>;
  upsertStarPointConfigs(
    configs: StarPointConfigData[],
  ): Promise<StarPointConfigData[]>;
  getRankConfigs(): Promise<RankConfigData[]>;
  upsertRankConfigs(configs: RankConfigData[]): Promise<RankConfigData[]>;

  findTransactionReviewContext(
    transactionId: string,
  ): Promise<TransactionReviewContextData | null>;
  hasReview(transactionId: string, reviewerId: string): Promise<boolean>;
  createReviewAndAwardPoints(data: CreateReviewData): Promise<ReviewData>;

  createWithdrawalRequest(
    data: CreateWithdrawalRequestData,
  ): Promise<WithdrawalRequestData>;
  findUserWithdrawalRequests(userId: string): Promise<WithdrawalRequestData[]>;
  findWithdrawalRequests(
    status?: WithdrawalStatus,
  ): Promise<WithdrawalRequestData[]>;
  approveWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminNote?: string,
  ): Promise<WithdrawalRequestData>;
  rejectWithdrawal(
    data: AdminRejectWithdrawalData,
  ): Promise<WithdrawalRequestData>;
  markWithdrawalPaid(
    data: AdminMarkWithdrawalPaidData,
  ): Promise<WithdrawalRequestData>;

  /**
   * Awards a fixed one-time bonus for account milestones (registration, verifications).
   * Idempotent per user and sourceType via the point ledger.
   * @returns true if the bonus was granted, false if already claimed or user missing.
   */
  grantAccountLifetimeMilestoneBonus(
    userId: string,
    sourceType: PointSourceType,
  ): Promise<boolean>;
}

export const POINTS_REPOSITORY = Symbol('POINTS_REPOSITORY');
