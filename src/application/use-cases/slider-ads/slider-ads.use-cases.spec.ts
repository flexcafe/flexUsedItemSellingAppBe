/* eslint-disable @typescript-eslint/unbound-method */
import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateSliderAdUseCase } from './create-slider-ad.use-case.js';
import { UpdateSliderAdUseCase } from './update-slider-ad.use-case.js';
import { DeleteSliderAdUseCase } from './delete-slider-ad.use-case.js';
import { ListSliderAdsUseCase } from './list-slider-ads.use-case.js';
import type { ISliderAdRepository } from '../../../domain/repositories/slider-ad.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SliderAdEntity } from '../../../domain/entities/slider-ad.entity.js';
import { SliderAdStatus } from '../../../domain/enums/slider-ad-status.enum.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';

function buildAdmin(isAdmin = true) {
  return new UserEntity({
    id: 'admin-1',
    registrationType: RegistrationType.EMAIL_ONLY,
    phone: '+959000000000',
    email: 'admin@example.com',
    password: 'hashed',
    nickname: 'Admin',
    facebookId: null,
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
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    adminRoleId: isAdmin ? 'role-1' : null,
  });
}

function buildSliderAd(
  overrides: Partial<ConstructorParameters<typeof SliderAdEntity>[0]> = {},
) {
  return new SliderAdEntity({
    id: 'ad-1',
    title: 'Promo',
    imageUrl: 'https://img',
    linkUrl: null,
    status: SliderAdStatus.ACTIVE,
    sortOrder: 0,
    startsAt: null,
    endsAt: null,
    createdById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function buildSliderRepoMock(): jest.Mocked<ISliderAdRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    listAll: jest.fn(),
    listActive: jest.fn(),
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

describe('Slider ads use-cases', () => {
  it('create requires admin', async () => {
    const sliderRepo = buildSliderRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue(buildAdmin(false));
    const useCase = new CreateSliderAdUseCase(sliderRepo, userRepo);
    await expect(
      useCase.execute('admin-1', { title: 'T' }, 'https://img'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create calls repo.create', async () => {
    const sliderRepo = buildSliderRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue(buildAdmin(true));
    sliderRepo.create.mockResolvedValue(buildSliderAd({ title: 'T' }));

    const useCase = new CreateSliderAdUseCase(sliderRepo, userRepo);
    const created = await useCase.execute(
      'admin-1',
      { title: 'T', sortOrder: 1 },
      'https://img',
    );
    expect(created.title).toBe('T');
    expect(sliderRepo.create).toHaveBeenCalledTimes(1);
  });

  it('update rejects when ad not found', async () => {
    const sliderRepo = buildSliderRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue(buildAdmin(true));
    sliderRepo.findById.mockResolvedValue(null);

    const useCase = new UpdateSliderAdUseCase(sliderRepo, userRepo);
    await expect(
      useCase.execute('admin-1', 'ad-1', { title: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete rejects when admin missing', async () => {
    const sliderRepo = buildSliderRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue(null);
    const useCase = new DeleteSliderAdUseCase(sliderRepo, userRepo);
    await expect(useCase.execute('admin-1', 'ad-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listActive delegates to repo', async () => {
    const sliderRepo = buildSliderRepoMock();
    sliderRepo.listActive.mockResolvedValue([buildSliderAd()]);
    const useCase = new ListSliderAdsUseCase(sliderRepo);
    const rows = await useCase.listActive();
    expect(rows).toHaveLength(1);
    expect(sliderRepo.listActive).toHaveBeenCalledTimes(1);
  });
});
