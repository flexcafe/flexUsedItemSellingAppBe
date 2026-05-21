import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { GetPublicUserProfileUseCase } from './get-public-user-profile.use-case.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';

describe(GetPublicUserProfileUseCase.name, () => {
  it('returns public profile including referralCode', async () => {
    const pointsRepository = {
      getPublicUserProfile: jest.fn(async () => ({
        userId: 'seller-1',
        nickname: 'Seller A',
        avatar: null,
        region: 'Yangon',
        referralCode: 'ABC12345',
        currentRank: RankTier.BRONZE,
        averageStars: 4.5,
        totalReviews: 10,
        completedSales: 3,
        completedPurchases: 1,
        memberSince: new Date('2025-01-01'),
      })),
    } as unknown as jest.Mocked<IPointsRepository>;

    const useCase = new GetPublicUserProfileUseCase(pointsRepository);
    const profile = await useCase.execute('seller-1');

    expect(profile.referralCode).toBe('ABC12345');
  });

  it('throws when user not found', async () => {
    const pointsRepository = {
      getPublicUserProfile: jest.fn(async () => null),
    } as unknown as jest.Mocked<IPointsRepository>;

    const useCase = new GetPublicUserProfileUseCase(pointsRepository);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
