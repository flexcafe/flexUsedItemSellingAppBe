import { jest } from '@jest/globals';
import { ProductRepository } from './product.repository.js';

function buildPrismaMock() {
  return {
    $queryRaw: jest.fn(),
    listing: {
      findMany: jest.fn(),
    },
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
});

