import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SubmitFacebookFollowUseCase } from './submit-facebook-follow.use-case.js';
import type { IFacebookRepository } from '../../../domain/repositories/facebook.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { IFileStorage } from '../../../domain/services/file-storage.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { FacebookFollowSubmissionStatus } from '../../../domain/enums/facebook-follow-submission-status.enum.js';

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
    facebookId: 'fb-1',
    isEmailVerified: true,
    isPhoneVerified: true,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    isActive: true,
    isBanned: false,
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: 'REF',
    referredById: null,
    adminRoleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe(SubmitFacebookFollowUseCase.name, () => {
  it('rejects when facebook is not linked', async () => {
    const config = { get: jest.fn().mockReturnValue('facebook-follow-submissions') } as unknown as ConfigService;
    const storage = { uploadPublicFile: jest.fn(), removePublicFiles: jest.fn() } as unknown as IFileStorage;
    const facebookRepo = {
      findLatestFacebookFollowSubmissionByUserId: jest.fn(),
    } as unknown as IFacebookRepository;
    const userRepo = {
      findById: jest.fn().mockResolvedValue(buildUser({ facebookId: null })),
      createNotification: jest.fn(),
      findAdminUserIds: jest.fn().mockResolvedValue([]),
    } as unknown as IUserRepository;

    const useCase = new SubmitFacebookFollowUseCase(
      config,
      storage,
      facebookRepo,
      userRepo,
    );

    await expect(
      useCase.execute(
        'user-1',
        {
          facebookName: 'John',
          facebookProfileUrl: 'https://facebook.com/p',
          facebookPageUrl: 'https://facebook.com/page',
        },
        { originalName: 's.webp', mimeType: 'image/webp', body: Buffer.from('x') },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when a pending submission already exists', async () => {
    const config = { get: jest.fn().mockReturnValue('facebook-follow-submissions') } as unknown as ConfigService;
    const storage = { uploadPublicFile: jest.fn(), removePublicFiles: jest.fn() } as unknown as IFileStorage;
    const facebookRepo = {
      findLatestFacebookFollowSubmissionByUserId: jest
        .fn()
        .mockResolvedValue({ status: FacebookFollowSubmissionStatus.PENDING }),
    } as unknown as IFacebookRepository;
    const userRepo = {
      findById: jest.fn().mockResolvedValue(buildUser()),
      createNotification: jest.fn(),
      findAdminUserIds: jest.fn().mockResolvedValue([]),
    } as unknown as IUserRepository;

    const useCase = new SubmitFacebookFollowUseCase(
      config,
      storage,
      facebookRepo,
      userRepo,
    );

    await expect(
      useCase.execute(
        'user-1',
        {
          facebookName: 'John',
          facebookProfileUrl: 'https://facebook.com/p',
          facebookPageUrl: 'https://facebook.com/page',
        },
        { originalName: 's.webp', mimeType: 'image/webp', body: Buffer.from('x') },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

