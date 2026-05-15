import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import request from 'supertest';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { ApiResponseDto } from '../../dtos/common/api-response.dto.js';
import { PaginatedResponseDto } from '../../dtos/common/pagination.dto.js';
import { ProductResponseDto } from '../../dtos/product/product-response.dto.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import { ListProductsUseCase } from './list-products.use-case.js';
import { GetProductDetailUseCase } from './get-product-detail.use-case.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientProductsController } from '../../../presentation/modules/product/client-products.controller.js';
import { CreateProductUseCase } from './create-product.use-case.js';
import { GetMyProductDetailUseCase } from './get-my-product-detail.use-case.js';
import { ListMyProductsUseCase } from './list-my-products.use-case.js';
import { UpdateProductUseCase } from './update-product.use-case.js';
import { DeleteProductUseCase } from './delete-product.use-case.js';
import { UploadProductMediaUseCase } from './upload-product-media.use-case.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';

const LISTING_ID = '11111111-1111-1111-1111-111111111111';

function buildListing(createdAt: Date): ListingEntity {
  return new ListingEntity({
    id: LISTING_ID,
    title: 'Test listing',
    description: 'desc',
    price: 100,
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
    sellerId: '22222222-2222-2222-2222-222222222222',
    categoryId: '33333333-3333-3333-3333-333333333333',
    createdAt,
    updatedAt: createdAt,
  });
}

function buildConfigMock(): ConfigService {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'LISTING_DISPLAY_TIMEZONE') {
        return 'UTC';
      }
      return def;
    }),
  } as unknown as ConfigService;
}

function buildProductRepoMock(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForSeller: jest.fn(),
    findBySeller: jest.fn(),
    updateBySeller: jest.fn(),
    softDeleteBySeller: jest.fn(),
    search: jest.fn(),
  };
}

describe('createdAtDisplay (public product responses)', () => {
  const now = new Date('2026-05-14T12:00:00.000Z');
  const createdAt = new Date('2026-05-14T10:00:00.000Z');

  it('ListProductsUseCase sets createdAtDisplay on each item', async () => {
    const repo = buildProductRepoMock();
    repo.search.mockResolvedValue({ rows: [buildListing(createdAt)], total: 1 });
    const useCase = new ListProductsUseCase(repo, buildConfigMock());

    jest.useFakeTimers();
    jest.setSystemTime(now);
    const page = await useCase.execute({ page: 1, limit: 20 });
    jest.useRealTimers();

    expect(page.items).toHaveLength(1);
    expect(page.items[0].createdAtDisplay).toBe('2 h ago');
  });

  it('GetProductDetailUseCase sets createdAtDisplay on data', async () => {
    const repo = buildProductRepoMock();
    repo.findById.mockResolvedValue(buildListing(createdAt));
    const useCase = new GetProductDetailUseCase(repo, buildConfigMock());

    jest.useFakeTimers();
    jest.setSystemTime(now);
    const dto = await useCase.execute(LISTING_ID);
    jest.useRealTimers();

    expect(dto.createdAtDisplay).toBe('2 h ago');
  });

  it('survives JSON serialization like Express res.json()', () => {
    const dto = ProductResponseDto.fromPublicListing(buildListing(createdAt), {
      now,
      timeZone: 'UTC',
    });
    const paginated = new PaginatedResponseDto([dto], 1, 1, 20);
    const envelope = ApiResponseDto.success(paginated, {
      message: 'Products retrieved',
      listingDisplayTimezone: 'UTC',
    });

    const json = JSON.parse(JSON.stringify(envelope)) as {
      listingDisplayTimezone?: string;
      data: { items: Array<{ createdAtDisplay?: string }> };
    };

    expect(json.listingDisplayTimezone).toBe('UTC');
    expect(json.data.items[0].createdAtDisplay).toBe('2 h ago');
  });

  it('GET /api/v1/client/products returns createdAtDisplay in response body', async () => {
    const dto = ProductResponseDto.fromPublicListing(buildListing(createdAt), {
      now,
      timeZone: 'UTC',
    });
    const paginated = new PaginatedResponseDto([dto], 1, 1, 20);
    const list = { execute: jest.fn(async () => paginated) };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: (_k: string, def?: string) => def },
        },
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: ListProductsUseCase, useValue: list },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetMyProductDetailUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: UploadProductMediaUseCase,
          useValue: {
            uploadListingImages: jest.fn(async () => []),
            uploadMapScreenshot: jest.fn(async () => null),
          },
        },
      ],
      overrideGuards: [{ guard: JwtAuthGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/products')
      .expect(200);

    expect(res.body.data.items[0].createdAtDisplay).toBe('2 h ago');
    expect(res.body.listingDisplayTimezone).toBe('UTC');

    await close();
  });

  it('GET /api/v1/client/products/:id returns createdAtDisplay in response body', async () => {
    const dto = ProductResponseDto.fromPublicListing(buildListing(createdAt), {
      now,
      timeZone: 'UTC',
    });
    const getDetail = { execute: jest.fn(async () => dto) };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: (_k: string, def?: string) => def },
        },
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: ListProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetProductDetailUseCase, useValue: getDetail },
        {
          provide: GetMyProductDetailUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: UploadProductMediaUseCase,
          useValue: {
            uploadListingImages: jest.fn(async () => []),
            uploadMapScreenshot: jest.fn(async () => null),
          },
        },
      ],
      overrideGuards: [{ guard: JwtAuthGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/client/products/${LISTING_ID}`)
      .expect(200);

    expect(res.body.data.createdAtDisplay).toBe('2 h ago');
    expect(res.body.listingDisplayTimezone).toBe('UTC');

    await close();
  });
});
