import { jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { LinkFacebookUseCase } from './link-facebook.use-case.js';
import type { IFacebookRepository } from '../../../domain/repositories/facebook.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { IFacebookAuthService } from '../../../domain/services/facebook-auth.interface.js';
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

function buildUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
    findByFacebookId: jest.fn(),
    createNotification: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

function buildFacebookRepoMock(): jest.Mocked<IFacebookRepository> {
  return {
    setFacebookLink: jest.fn(),
  } as unknown as jest.Mocked<IFacebookRepository>;
}

function buildFacebookAuthMock(): jest.Mocked<IFacebookAuthService> {
  return {
    verifyUserAccessToken: jest.fn(),
  };
}

describe(LinkFacebookUseCase.name, () => {
  it('throws not found when user does not exist', async () => {
    const userRepo = buildUserRepoMock();
    const facebookRepo = buildFacebookRepoMock();
    const facebookAuth = buildFacebookAuthMock();
    userRepo.findById.mockResolvedValue(null);

    const useCase = new LinkFacebookUseCase(facebookRepo, userRepo, facebookAuth);
    await expect(
      useCase.execute('user-1', {
        facebookAccessToken: 'token',
        facebookProfileUrl: 'https://www.facebook.com/some.profile',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws conflict when verified facebook id belongs to another user', async () => {
    const userRepo = buildUserRepoMock();
    const facebookRepo = buildFacebookRepoMock();
    const facebookAuth = buildFacebookAuthMock();
    userRepo.findById.mockResolvedValue(buildUser());
    facebookAuth.verifyUserAccessToken.mockResolvedValue({
      id: 'fb-123',
      name: 'John',
    });
    userRepo.findByFacebookId.mockResolvedValue(buildUser({ id: 'user-2' }));

    const useCase = new LinkFacebookUseCase(facebookRepo, userRepo, facebookAuth);
    await expect(
      useCase.execute('user-1', {
        facebookAccessToken: 'token',
        facebookProfileUrl: 'https://www.facebook.com/some.profile',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('links using verified facebook identity from auth service', async () => {
    const userRepo = buildUserRepoMock();
    const facebookRepo = buildFacebookRepoMock();
    const facebookAuth = buildFacebookAuthMock();
    userRepo.findById.mockResolvedValue(buildUser());
    facebookAuth.verifyUserAccessToken.mockResolvedValue({
      id: 'verified-fb-id',
      name: 'Verified Name',
    });
    userRepo.findByFacebookId.mockResolvedValue(null);

    const useCase = new LinkFacebookUseCase(facebookRepo, userRepo, facebookAuth);
    await useCase.execute('user-1', {
      facebookAccessToken: 'token',
      facebookProfileUrl: 'https://www.facebook.com/some.profile',
    });

    expect(facebookAuth.verifyUserAccessToken).toHaveBeenCalledWith('token');
    expect(facebookRepo.setFacebookLink).toHaveBeenCalledWith({
      userId: 'user-1',
      facebookId: 'verified-fb-id',
      facebookName: 'Verified Name',
      facebookProfileUrl: 'https://www.facebook.com/some.profile',
    });
    expect(userRepo.createNotification).toHaveBeenCalledTimes(1);
  });
});
