import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteProductUseCase } from './delete-product.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

function buildListing(overrides: Partial<ConstructorParameters<typeof ListingEntity>[0]> = {}) {
  return new ListingEntity({
    id: 'p1',
    title: 'My Phone',
    description: 'd',
    price: 1,
    condition: ListingCondition.GOOD,
    status: ListingStatus.ACTIVE,
    paymentMethods: [PaymentMethod.CASH],
    directTradeLocation: null,
    directTradeLatitude: null,
    directTradeLongitude: null,
    mapScreenshotUrl: null,
    nearbyLandmarks: null,
    preferredTradeTime: null,
    isDeliveryAvailable: false,
    deliveryFeePayer: null,
    images: [],
    isDeleted: false,
    viewCount: 0,
    sellerId: 'u1',
    categoryId: 'c1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function buildProductRepoMock(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findBySeller: jest.fn(),
    updateBySeller: jest.fn(),
    softDeleteBySeller: jest.fn(),
    search: jest.fn(),
  };
}

describe(DeleteProductUseCase.name, () => {
  it('throws when listing is missing', async () => {
    const repo = buildProductRepoMock();
    repo.findById.mockResolvedValue(null);
    const uc = new DeleteProductUseCase(repo);
    await expect(
      uc.execute('u1', 'p1', { confirmTitle: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.softDeleteBySeller).not.toHaveBeenCalled();
  });

  it('throws when another user owns the listing', async () => {
    const repo = buildProductRepoMock();
    repo.findById.mockResolvedValue(buildListing({ sellerId: 'other' }));
    const uc = new DeleteProductUseCase(repo);
    await expect(
      uc.execute('u1', 'p1', { confirmTitle: 'My Phone' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.softDeleteBySeller).not.toHaveBeenCalled();
  });

  it('throws when listing is sold', async () => {
    const repo = buildProductRepoMock();
    repo.findById.mockResolvedValue(
      buildListing({ status: ListingStatus.SOLD }),
    );
    const uc = new DeleteProductUseCase(repo);
    await expect(
      uc.execute('u1', 'p1', { confirmTitle: 'My Phone' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.softDeleteBySeller).not.toHaveBeenCalled();
  });

  it('throws when confirmation title does not match', async () => {
    const repo = buildProductRepoMock();
    repo.findById.mockResolvedValue(buildListing());
    const uc = new DeleteProductUseCase(repo);
    await expect(
      uc.execute('u1', 'p1', { confirmTitle: 'Wrong' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.softDeleteBySeller).not.toHaveBeenCalled();
  });

  it('accepts trimmed confirmation matching trimmed title', async () => {
    const repo = buildProductRepoMock();
    repo.findById.mockResolvedValue(buildListing({ title: '  My Phone  ' }));
    repo.softDeleteBySeller.mockResolvedValue(true);
    const uc = new DeleteProductUseCase(repo);
    await uc.execute('u1', 'p1', { confirmTitle: 'My Phone' });
    expect(repo.softDeleteBySeller).toHaveBeenCalledWith('p1', 'u1');
  });
});
