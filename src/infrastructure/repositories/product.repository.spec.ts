import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ProductRepository } from './product.repository.js';

function buildPrismaMock() {
  const tx = {
    listing: {
      updateMany: jest.fn(),
    },
    listingImage: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    preferredTradeLocation: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
  return {
    $transaction: jest.fn(async (cb: (ctx: typeof tx) => unknown) => cb(tx)),
    $queryRaw: jest.fn(),
    listing: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    tx,
  };
}

describe(ProductRepository.name, () => {
  it('uses geo ordering with nulls last when coordinates are provided', async () => {
    const prisma = buildPrismaMock();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{ id: 'p1' }]);
    prisma.listing.findMany.mockResolvedValue([
      {
        id: 'p1',
        isDeleted: false,
        title: 'Phone',
        description: 'desc',
        price: 100,
        condition: 'GOOD',
        status: 'ACTIVE',
        paymentMethods: ['CASH'],
        directTradeLocation: null,
        directTradeLatitude: null,
        directTradeLongitude: null,
        mapScreenshotUrl: null,
        nearbyLandmarks: null,
        preferredTradeTime: null,
        isDeliveryAvailable: false,
        deliveryFeePayer: null,
        viewCount: 0,
        sellerId: 'u1',
        categoryId: 'c1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        seller: null,
        images: [],
      },
    ]);

    const repo = new ProductRepository(prisma as any);
    await repo.search({
      skip: 0,
      take: 20,
      latitude: 16.8,
      longitude: 96.1,
    });

    const geoSql = (prisma.$queryRaw as jest.Mock).mock.calls[1][0] as any;
    const sqlText = Array.isArray(geoSql?.strings)
      ? geoSql.strings.join(' ')
      : '';
    expect(sqlText).toContain('(l.geo_location IS NULL)');
    expect(sqlText).toContain('NULLS LAST');
  });

  it('throws not found when concurrent update makes row unavailable', async () => {
    const prisma = buildPrismaMock();
    prisma.listing.findUnique.mockResolvedValue({
      id: 'p1',
      sellerId: 'u1',
      isDeleted: false,
    });
    prisma.tx.listing.updateMany.mockResolvedValue({ count: 0 });

    const repo = new ProductRepository(prisma as any);

    await expect(repo.updateBySeller('p1', 'u1', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws not found when concurrent delete already archived row', async () => {
    const prisma = buildPrismaMock();
    prisma.listing.findUnique.mockResolvedValue({
      id: 'p1',
      sellerId: 'u1',
      isDeleted: false,
    });
    prisma.listing.updateMany.mockResolvedValue({ count: 0 });

    const repo = new ProductRepository(prisma as any);

    await expect(repo.softDeleteBySeller('p1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
