import { describe, expect, it } from '@jest/globals';
import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ListSellerReviewsUseCase } from './list-seller-reviews.use-case.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';

describe(ListSellerReviewsUseCase.name, () => {
  it('returns paginated reviews with star breakdown', async () => {
    const repo = {
      getSellerReviews: jest.fn(async () => ({
        starBreakdown: [
          { stars: 1, count: 0 },
          { stars: 2, count: 0 },
          { stars: 3, count: 2 },
          { stars: 4, count: 1 },
          { stars: 5, count: 6 },
        ],
        items: [
          {
            id: 'r1',
            stars: 5,
            comment: 'Great seller',
            reviewerNickname: 'Buyer1',
            reviewerAvatar: null,
            createdAt: new Date('2026-05-01'),
          },
        ],
        total: 9,
      })),
    } as unknown as jest.Mocked<IPointsRepository>;

    const useCase = new ListSellerReviewsUseCase(repo);
    const page = await useCase.execute('seller-1', { page: 1, limit: 10 });

    expect(page.starBreakdown).toHaveLength(5);
    expect(page.starBreakdown[4].count).toBe(6);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(9);
  });

  it('throws when seller not found', async () => {
    const repo = {
      getSellerReviews: jest.fn(async () => null),
    } as unknown as jest.Mocked<IPointsRepository>;
    const useCase = new ListSellerReviewsUseCase(repo);

    await expect(
      useCase.execute('missing', { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
