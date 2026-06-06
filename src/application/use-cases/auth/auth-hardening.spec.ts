/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ResetPasswordUseCase } from './reset-password.use-case.js';
import { SendPhoneOtpUseCase } from './send-phone-otp.use-case.js';
import { SendEmailVerificationUseCase } from './send-email-verification.use-case.js';
import { VerifyPhoneOtpUseCase } from './verify-phone-otp.use-case.js';
import { VerifyEmailVerificationUseCase } from './verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from './request-kbzpay-verification.use-case.js';
import { SubmitKbzPayTransactionUseCase } from './submit-kbzpay-transaction.use-case.js';
import { GetCurrentUserProfileUseCase } from './get-current-user-profile.use-case.js';
import type { IUserRepository, UserAuthData } from '../../../domain/repositories/user.repository.interface.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../../domain/enums/marital-status.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';

function buildUser(overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {}) {
  return new UserEntity({
    id: 'user-1',
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
    totalPoints: 10,
    currentRank: RankTier.NEWBIE,
    referralCode: 'REFCODE',
    referredById: null,
    adminRoleId: null,
    authTokenVersion: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });
}

function buildAuthData(user: UserEntity): UserAuthData {
  return {
    user,
    profile: {
      gender: Gender.MALE,
      age: 27,
      maritalStatus: MaritalStatus.SINGLE,
      inputRegion: 'Yangon Region',
      gpsLatitude: 16.84,
      gpsLongitude: 96.17,
      isRegionVerified: true,
      gpsVerifiedAt: new Date('2026-01-01'),
    },
    kbzPayAccount: {
      accountName: 'Kyaw Zin',
      phoneNumber: '+959876543210',
      kbzTransactionId: null,
      status: VerificationStatus.PENDING,
      isVerified: false,
      verifyRequestedAt: null,
      adminPhoneForTransfer: null,
      adminInstructionSentAt: null,
      verifiedAt: null,
      adminNote: null,
    },
    adminRole: null,
  };
}

function buildRepoMock(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findByFacebookId: jest.fn(),
    findByReferralCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    setUserBanned: jest.fn(),
    delete: jest.fn(),
    getProfileAvatarUrl: jest.fn(),
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
    findAdminUserIds: jest.fn().mockResolvedValue([]),
    listAdminUsers: jest.fn(),
    createNotification: jest.fn(),
    listNotificationsByUserId: jest.fn(),
    markNotificationRead: jest.fn(),
    getAuthDataByUserId: jest.fn(),
    getAdminRoleByUserId: jest.fn(),
    findKbzPayVerificationRequested: jest.fn(),
    findKbzPayMoneyCheckList: jest.fn(),
    findKbzPayVerifiedUsers: jest.fn(),
    findKbzPayRegisteredAccounts: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
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
    grantAccountLifetimeMilestoneBonus: jest.fn().mockResolvedValue(true),
    deductPointsForTransactionCancellation: jest.fn(),
  } as unknown as jest.Mocked<IPointsRepository>;
}

function buildSmsSenderMock(): jest.Mocked<ISmsSender> {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

function buildEmailSenderMock(): jest.Mocked<IEmailSender> {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

describe('Auth hardening', () => {
  it('rejects phone OTP resend for already verified users', async () => {
    const repo = buildRepoMock();
    repo.findByPhone.mockResolvedValue(buildUser({ isPhoneVerified: true }));
    const useCase = new SendPhoneOtpUseCase(repo, buildSmsSenderMock());

    await expect(
      useCase.execute({ phone: '+959123456789' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects email verification resend for already verified users', async () => {
    const repo = buildRepoMock();
    repo.findByEmail.mockResolvedValue(buildUser({ isEmailVerified: true }));
    const useCase = new SendEmailVerificationUseCase(repo, buildEmailSenderMock());

    await expect(
      useCase.execute({ email: 'john@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects inactive users from KBZPay and profile auth flows', async () => {
    const repo = buildRepoMock();
    const user = buildUser({ isActive: false });
    repo.findByPhone.mockResolvedValue(user);
    repo.findByEmail.mockResolvedValue(user);
    repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));

    await expect(
      new VerifyPhoneOtpUseCase(repo, buildPointsRepoMock()).execute({
        phone: user.phone,
        code: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      new VerifyEmailVerificationUseCase(repo, buildPointsRepoMock()).execute({
        email: user.email ?? '',
        token: 'tok',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      new RequestKbzPayVerificationUseCase(repo).execute(user.id, { message: 'hi' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      new SubmitKbzPayTransactionUseCase(repo).execute(user.id, {
        kbzTransactionId: 'TX-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      new GetCurrentUserProfileUseCase(repo).execute(user.id),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('bumps auth token version on password reset', async () => {
    const repo = buildRepoMock();
    const user = buildUser({ authTokenVersion: 2 });
    repo.findByPhone.mockResolvedValue(user);
    repo.findLatestActivePhoneOtp.mockResolvedValue({
      id: 'otp-1',
      phone: user.phone,
      code: '123456',
      purpose: 'PASSWORD_RESET' as never,
      status: VerificationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      maxAttempts: 5,
    });
    repo.markPhoneOtpVerified.mockResolvedValue(undefined);
    repo.update.mockResolvedValue(buildUser({ authTokenVersion: 3 }));

    const useCase = new ResetPasswordUseCase(repo);

    await useCase.execute({
      phone: user.phone,
      code: '123456',
      newPassword: 'new-password',
      confirmNewPassword: 'new-password',
    });

    expect(repo.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ authTokenVersion: 3 }),
    );
  });
});
