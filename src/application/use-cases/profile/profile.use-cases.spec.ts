/* eslint-disable @typescript-eslint/unbound-method */
import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { ChangePasswordUseCase } from './change-password.use-case.js';
import { UploadAvatarUseCase } from './upload-avatar.use-case.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { IFileStorage } from '../../../domain/services/file-storage.interface.js';
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
    getProfileAvatarUrl: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findByFacebookId: jest.fn(),
    findByReferralCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

function buildStorageMock(): jest.Mocked<IFileStorage> {
  return {
    uploadPublicFile: jest.fn(),
    removePublicFiles: jest.fn(),
  };
}

describe('Profile use-cases', () => {
  describe(ChangePasswordUseCase.name, () => {
    it('rejects when newPassword != confirmNewPassword', async () => {
      const repo = buildRepoMock();
      const useCase = new ChangePasswordUseCase(repo);
      await expect(
        useCase.execute('user-1', {
          currentPassword: 'old',
          newPassword: 'newpass123',
          confirmNewPassword: 'nope',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when user not found', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(null);
      const useCase = new ChangePasswordUseCase(repo);
      await expect(
        useCase.execute('user-1', {
          currentPassword: 'old',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when current password incorrect', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(
        buildUser({ password: await hash('correct', 12) }),
      );
      const useCase = new ChangePasswordUseCase(repo);
      await expect(
        useCase.execute('user-1', {
          currentPassword: 'wrong',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates password hash on success', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(
        buildUser({ password: await hash('old', 12) }),
      );
      repo.update.mockResolvedValue(buildUser());

      const useCase = new ChangePasswordUseCase(repo);
      await useCase.execute('user-1', {
        currentPassword: 'old',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });

      expect(repo.update).toHaveBeenCalledTimes(1);
      const [, updateData] = repo.update.mock.calls[0] ?? [];
      expect(typeof updateData?.password).toBe('string');
      expect(updateData?.password).not.toBe('old');
    });
  });

  describe(UploadAvatarUseCase.name, () => {
    it('rejects when user not found', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(null);
      const storage = buildStorageMock();
      const config = {
        get: jest.fn().mockReturnValue('avatars'),
      } as unknown as ConfigService;

      const useCase = new UploadAvatarUseCase(config, storage, repo);
      await expect(
        useCase.execute('user-1', {
          originalName: 'a.png',
          mimeType: 'image/png',
          body: Buffer.from('x'),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when file is empty', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(buildUser());
      const storage = buildStorageMock();
      const config = {
        get: jest.fn().mockReturnValue('avatars'),
      } as unknown as ConfigService;

      const useCase = new UploadAvatarUseCase(config, storage, repo);
      await expect(
        useCase.execute('user-1', {
          originalName: 'a.png',
          mimeType: 'image/png',
          body: Buffer.from([]),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uploads file and stores avatar url', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(buildUser());
      const storage = buildStorageMock();
      storage.uploadPublicFile.mockResolvedValue({
        publicUrl: 'https://cdn.example.com/u.png',
      });
      const config = {
        get: jest.fn().mockReturnValue('avatars'),
      } as unknown as ConfigService;

      const useCase = new UploadAvatarUseCase(config, storage, repo);
      const url = await useCase.execute('user-1', {
        originalName: 'a.png',
        mimeType: 'image/png',
        body: Buffer.from('file'),
      });

      expect(url).toBe('https://cdn.example.com/u.png');
      expect(storage.uploadPublicFile).toHaveBeenCalledTimes(1);
      expect(repo.setProfileAvatar).toHaveBeenCalledWith('user-1', url);
    });
  });
});
