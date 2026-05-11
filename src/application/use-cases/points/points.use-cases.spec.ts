import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GetPointsSummaryUseCase } from './get-points-summary.use-case.js';
import { RequestWithdrawalUseCase } from './request-withdrawal.use-case.js';
import { ManagePointConfigUseCase } from './manage-point-config.use-case.js';
import { ListClientRankConfigUseCase } from './list-client-rank-config.use-case.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';

function buildUser(isAdmin = false) {
  return new UserEntity({
    id: isAdmin ? 'admin-1' : 'user-1',
    registrationType: RegistrationType.PHONE_ONLY,
    phone: '+959123456789',
    email: 'john@example.com',
    password: 'hashed',
    nickname: 'Nick',
    facebookId: null,
    isEmailVerified: false,
    isPhoneVerified: false,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    isActive: true,
    isBanned: false,
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: 'REF',
    referredById: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminRoleId: isAdmin ? 'role-1' : null,
  });
}

function buildPointsRepoMock(): jest.Mocked<IPointsRepository> {
  return {
    getUserPointsSummary: jest.fn(),
    getUserTransactionStats: jest.fn(),
    getPublicUserProfile: jest.fn(),
    getStarPointConfigs: jest.fn(),
    upsertStarPointConfigs: jest.fn(),
    getRankConfigs: jest.fn(),
    upsertRankConfigs: jest.fn(),
    findTransactionReviewContext: jest.fn(),
    hasReview: jest.fn(),
    createReviewAndAwardPoints: jest.fn(),
    createWithdrawalRequest: jest.fn(),
    findUserWithdrawalRequests: jest.fn(),
    findWithdrawalRequests: jest.fn(),
    approveWithdrawal: jest.fn(),
    rejectWithdrawal: jest.fn(),
    markWithdrawalPaid: jest.fn(),
    grantAccountLifetimeMilestoneBonus: jest.fn(),
  };
}

function buildUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findByFacebookId: jest.fn(),
    findByReferralCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getProfileAvatarUrl: jest.fn().mockResolvedValue(null),
    setProfileAvatar: jest.fn(),
    createPhoneOtp: jest.fn(),
    findLatestActivePhoneOtp: jest.fn(),
    incrementPhoneOtpAttempt: jest.fn(),
    markPhoneOtpFailed: jest.fn(),
    markPhoneOtpVerified: jest.fn(),
    markUserPhoneVerified: jest.fn(),
    createEmailVerification: jest.fn(),
    findActiveEmailVerification: jest.fn(),
    markEmailVerificationExpired: jest.fn(),
    markEmailVerificationVerified: jest.fn(),
    markUserEmailVerified: jest.fn(),
    requestKbzPayVerification: jest.fn(),
    setKbzPayTransactionId: jest.fn(),
    setKbzPayVerificationInstruction: jest.fn(),
    markKbzPayVerified: jest.fn(),
    findAdminUserIds: jest.fn(),
    createNotification: jest.fn(),
    listNotificationsByUserId: jest.fn(),
    markNotificationRead: jest.fn(),
    getAuthDataByUserId: jest.fn(),
    findKbzPayVerificationRequested: jest.fn(),
    findKbzPayMoneyCheckList: jest.fn(),
    findKbzPayVerifiedUsers: jest.fn(),
    findKbzPayRegisteredAccounts: jest.fn(),
  };
}

describe('Points use-cases', () => {
  describe(GetPointsSummaryUseCase.name, () => {
    it('throws when user not found', async () => {
      const pointsRepo = buildPointsRepoMock();
      pointsRepo.getUserPointsSummary.mockResolvedValue(null);
      const useCase = new GetPointsSummaryUseCase(pointsRepo);
      await expect(useCase.execute('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe(RequestWithdrawalUseCase.name, () => {
    it('requires KBZPay verified', async () => {
      const pointsRepo = buildPointsRepoMock();
      const userRepo = buildUserRepoMock();
      pointsRepo.getUserPointsSummary.mockResolvedValue({
        userId: 'user-1',
        nickname: 'Nick',
        totalPoints: 100,
        availableWithdrawalPoints: 100,
        currentRank: RankTier.NEWBIE,
        currentRankConfig: null,
        nextRankConfig: null,
        pendingWithdrawalAmount: 0,
      });
      userRepo.getAuthDataByUserId.mockResolvedValue({
        user: buildUser(false),
        profile: null,
        kbzPayAccount: {
          accountName: 'KBZ',
          phoneNumber: '+959',
          kbzTransactionId: null,
          status: VerificationStatus.PENDING,
          isVerified: false,
          verifyRequestedAt: null,
          adminPhoneForTransfer: null,
          adminInstructionSentAt: null,
          verifiedAt: null,
          adminNote: null,
        },
      });

      const useCase = new RequestWithdrawalUseCase(pointsRepo, userRepo);
      await expect(
        useCase.execute('user-1', { amount: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when amount exceeds available points', async () => {
      const pointsRepo = buildPointsRepoMock();
      const userRepo = buildUserRepoMock();
      pointsRepo.getUserPointsSummary.mockResolvedValue({
        userId: 'user-1',
        nickname: 'Nick',
        totalPoints: 50,
        availableWithdrawalPoints: 5,
        currentRank: RankTier.NEWBIE,
        currentRankConfig: null,
        nextRankConfig: null,
        pendingWithdrawalAmount: 45,
      });
      userRepo.getAuthDataByUserId.mockResolvedValue({
        user: buildUser(false),
        profile: null,
        kbzPayAccount: {
          accountName: 'KBZ',
          phoneNumber: '+959',
          kbzTransactionId: null,
          status: VerificationStatus.VERIFIED,
          isVerified: true,
          verifyRequestedAt: null,
          adminPhoneForTransfer: null,
          adminInstructionSentAt: null,
          verifiedAt: null,
          adminNote: null,
        },
      });

      const useCase = new RequestWithdrawalUseCase(pointsRepo, userRepo);
      await expect(
        useCase.execute('user-1', { amount: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe(ListClientRankConfigUseCase.name, () => {
    it('returns rank rows from repository', async () => {
      const pointsRepo = buildPointsRepoMock();
      pointsRepo.getRankConfigs.mockResolvedValue([
        {
          tier: RankTier.NEWBIE,
          minPoints: 0,
          maxPoints: 99,
          label: 'Newbie',
          badgeUrl: null,
          sortOrder: 1,
        },
      ]);
      const useCase = new ListClientRankConfigUseCase(pointsRepo);
      const rows = await useCase.execute();
      expect(pointsRepo.getRankConfigs).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tier).toBe(RankTier.NEWBIE);
      expect(rows[0]?.minPoints).toBe(0);
    });
  });

  describe(ManagePointConfigUseCase.name, () => {
    it('rejects when non-admin', async () => {
      const pointsRepo = buildPointsRepoMock();
      const userRepo = buildUserRepoMock();
      userRepo.findById.mockResolvedValue(buildUser(false));
      const useCase = new ManagePointConfigUseCase(pointsRepo, userRepo);
      await expect(useCase.listRankConfigs('user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
