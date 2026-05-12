import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateProductUseCase } from './create-product.use-case.js';
import { UpdateProductUseCase } from './update-product.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

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

function buildCategoryRepoMock(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn(),
  } as unknown as jest.Mocked<ICategoryRepository>;
}

function buildUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

describe(CreateProductUseCase.name, () => {
  it('rejects when product image count exceeds limit', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({ id: 'u1' } as any);
    categoryRepo.findById.mockResolvedValue({
      id: 'c1',
      isActive: true,
    } as any);

    const useCase = new CreateProductUseCase(
      productRepo,
      categoryRepo,
      userRepo,
    );
    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 'Product 1',
        description: 'desc',
        price: 1,
        paymentMethods: [PaymentMethod.CASH],
        isDeliveryAvailable: false,
        images: ['1', '2', '3', '4', '5', '6'],
        preferredLocations: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates active product for valid payload', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({ id: 'u1' } as any);
    categoryRepo.findById.mockResolvedValue({
      id: 'c1',
      isActive: true,
    } as any);
    productRepo.create.mockResolvedValue({
      id: 'p1',
      title: 'Phone',
      description: 'desc',
      price: 1200,
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
    } as any);

    const useCase = new CreateProductUseCase(
      productRepo,
      categoryRepo,
      userRepo,
    );
    await useCase.execute('u1', {
      categoryId: '11111111-1111-1111-1111-111111111111',
      title: 'Phone',
      description: 'desc',
      price: 1200,
      paymentMethods: [PaymentMethod.CASH],
      isDeliveryAvailable: false,
      images: [],
      preferredLocations: [],
    });

    expect(productRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: ListingStatus.ACTIVE }),
    );
  });

  it('rejects blank title/description after trim', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({ id: 'u1' } as any);
    categoryRepo.findById.mockResolvedValue({
      id: 'c1',
      isActive: true,
    } as any);

    const useCase = new CreateProductUseCase(
      productRepo,
      categoryRepo,
      userRepo,
    );

    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: '   ',
        description: 'desc',
        price: 1200,
        paymentMethods: [PaymentMethod.CASH],
        isDeliveryAvailable: false,
        images: [],
        preferredLocations: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 'Phone',
        description: '   ',
        price: 1200,
        paymentMethods: [PaymentMethod.CASH],
        isDeliveryAvailable: false,
        images: [],
        preferredLocations: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate payment methods', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({ id: 'u1' } as any);
    categoryRepo.findById.mockResolvedValue({
      id: 'c1',
      isActive: true,
    } as any);

    const useCase = new CreateProductUseCase(
      productRepo,
      categoryRepo,
      userRepo,
    );
    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 'Phone',
        description: 'desc',
        price: 1200,
        paymentMethods: [PaymentMethod.CASH, PaymentMethod.CASH],
        isDeliveryAvailable: false,
        images: [],
        preferredLocations: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when category is inactive or missing', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({ id: 'u1' } as any);
    categoryRepo.findById.mockResolvedValueOnce(null);

    const useCase = new CreateProductUseCase(
      productRepo,
      categoryRepo,
      userRepo,
    );
    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 'Phone',
        description: 'desc',
        price: 1200,
        paymentMethods: [PaymentMethod.CASH],
        isDeliveryAvailable: false,
        images: [],
        preferredLocations: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects blank direct trade location and preferred location fields', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({ id: 'u1' } as any);
    categoryRepo.findById.mockResolvedValue({
      id: 'c1',
      isActive: true,
    } as any);

    const useCase = new CreateProductUseCase(
      productRepo,
      categoryRepo,
      userRepo,
    );
    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 'Phone',
        description: 'desc',
        price: 1200,
        paymentMethods: [PaymentMethod.CASH],
        directTradeLocation: '  ',
        isDeliveryAvailable: false,
        images: [],
        preferredLocations: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      useCase.execute('u1', {
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 'Phone',
        description: 'desc',
        price: 1200,
        paymentMethods: [PaymentMethod.CASH],
        isDeliveryAvailable: false,
        images: [],
        preferredLocations: [{ label: ' ', address: 'ok' }] as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe(UpdateProductUseCase.name, () => {
  it('rejects blank direct trade location on update', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const useCase = new UpdateProductUseCase(productRepo, categoryRepo);

    await expect(
      useCase.execute('u1', 'p1', {
        directTradeLocation: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects preferred location with blank fields', async () => {
    const productRepo = buildProductRepoMock();
    const categoryRepo = buildCategoryRepoMock();
    const useCase = new UpdateProductUseCase(productRepo, categoryRepo);

    await expect(
      useCase.execute('u1', 'p1', {
        preferredLocations: [
          { label: '  ', address: 'somewhere' },
        ] as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
