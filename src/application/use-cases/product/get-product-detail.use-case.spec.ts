import { describe, expect, it } from '@jest/globals';
import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { GetProductDetailUseCase } from './get-product-detail.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { PreferredTradeLocationEntity } from '../../../domain/entities/preferred-trade-location.entity.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';

function buildListing() {
  return new ListingEntity({
    id: 'p1',
    title: 'Phone',
    description: 'Good condition',
    price: 100,
    condition: ListingCondition.GOOD,
    status: ListingStatus.ACTIVE,
    paymentMethods: [PaymentMethod.CASH, PaymentMethod.KBZPAY],
    directTradeLocation: 'Yangon',
    directTradeLatitude: 16.77,
    directTradeLongitude: 96.15,
    mapScreenshotUrl: null,
    nearbyLandmarks: null,
    preferredTradeTime: 'Weekends 9–12',
    isDeliveryAvailable: true,
    deliveryFeePayer: null,
    images: ['https://example.com/1.jpg'],
    isDeleted: false,
    viewCount: 0,
    sellerId: 'seller-1',
    categoryId: 'cat-1',
    createdAt: new Date('2026-05-14T10:00:00.000Z'),
    updatedAt: new Date('2026-05-14T10:00:00.000Z'),
    preferredLocations: [
      new PreferredTradeLocationEntity({
        id: 'loc-1',
        label: 'Location 1',
        address: 'Downtown',
        latitude: null,
        longitude: null,
        sortOrder: 0,
      }),
    ],
  });
}

describe(GetProductDetailUseCase.name, () => {
  it('returns public detail with seller and preferred locations', async () => {
    const productRepo = {
      findById: jest.fn(async () => buildListing()),
    } as unknown as jest.Mocked<IProductRepository>;
    const pointsRepo = {
      getPublicUserProfile: jest.fn(async () => ({
        userId: 'seller-1',
        nickname: 'Seller A',
        avatar: null,
        region: 'Yangon',
        currentRank: RankTier.BRONZE,
        averageStars: 4.5,
        totalReviews: 10,
        completedSales: 3,
        completedPurchases: 1,
        memberSince: new Date('2025-01-01'),
      })),
    } as unknown as jest.Mocked<IPointsRepository>;
    const config = {
      get: jest.fn((_k: string, def?: string) => def),
    } as unknown as ConfigService;

    const useCase = new GetProductDetailUseCase(
      productRepo,
      pointsRepo,
      config,
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-14T12:00:00.000Z'));
    const dto = await useCase.execute('p1');
    jest.useRealTimers();

    expect(dto.title).toBe('Phone');
    expect(dto.seller.nickname).toBe('Seller A');
    expect(dto.preferredLocations).toHaveLength(1);
    expect(dto.createdAtDisplay).toBe('2 h ago');
  });

  it('throws when product missing', async () => {
    const productRepo = {
      findById: jest.fn(async () => null),
    } as unknown as jest.Mocked<IProductRepository>;
    const pointsRepo = {
      getPublicUserProfile: jest.fn(),
    } as unknown as jest.Mocked<IPointsRepository>;
    const useCase = new GetProductDetailUseCase(
      productRepo,
      pointsRepo,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
