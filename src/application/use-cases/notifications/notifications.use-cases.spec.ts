/* eslint-disable @typescript-eslint/unbound-method */
import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListMyNotificationsUseCase } from './list-my-notifications.use-case.js';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';

function buildUser(
  overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {},
) {
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
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: 'REF',
    referredById: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminRoleId: null,
    ...overrides,
  });
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

describe('Notifications use-cases', () => {
  describe(ListMyNotificationsUseCase.name, () => {
    it('lists notifications for user', async () => {
      const repo = buildRepoMock();
      repo.listNotificationsByUserId.mockResolvedValue([
        {
          id: 'n1',
          userId: 'user-1',
          type: 'SYSTEM',
          eventKey: 'X',
          metadata: { a: 1 },
          title: 'T',
          message: 'M',
          referenceId: null,
          isRead: false,
          createdAt: new Date(),
        },
      ]);
      const useCase = new ListMyNotificationsUseCase(repo);
      const rows = await useCase.execute('user-1', 10);
      expect(rows).toHaveLength(1);
      expect(repo.listNotificationsByUserId).toHaveBeenCalledWith('user-1', 10);
    });
  });

  describe(MarkNotificationReadUseCase.name, () => {
    it('rejects when user not found', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(null);
      const useCase = new MarkNotificationReadUseCase(repo);
      await expect(useCase.execute('user-1', 'n1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects when user inactive', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(buildUser({ isActive: false }));
      const useCase = new MarkNotificationReadUseCase(repo);
      await expect(useCase.execute('user-1', 'n1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('marks notification read', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(buildUser());
      const useCase = new MarkNotificationReadUseCase(repo);
      await useCase.execute('user-1', 'n1');
      expect(repo.markNotificationRead).toHaveBeenCalledWith('n1', 'user-1');
    });
  });
});
