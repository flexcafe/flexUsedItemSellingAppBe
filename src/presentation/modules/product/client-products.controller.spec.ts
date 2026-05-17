import { jest } from '@jest/globals';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientProductsController } from './client-products.controller.js';
import { CreateProductUseCase } from '../../../application/use-cases/product/create-product.use-case.js';
import { ListProductsUseCase } from '../../../application/use-cases/product/list-products.use-case.js';
import { GetProductDetailUseCase } from '../../../application/use-cases/product/get-product-detail.use-case.js';
import { GetMyProductDetailUseCase } from '../../../application/use-cases/product/get-my-product-detail.use-case.js';
import { ListMyProductsUseCase } from '../../../application/use-cases/product/list-my-products.use-case.js';
import { UpdateProductUseCase } from '../../../application/use-cases/product/update-product.use-case.js';
import { DeleteProductUseCase } from '../../../application/use-cases/product/delete-product.use-case.js';
import { UploadProductMediaUseCase } from '../../../application/use-cases/product/upload-product-media.use-case.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

function buildUploadMediaMock() {
  return {
    uploadListingImages: jest.fn(async () => []),
    uploadMapScreenshot: jest.fn(async () => null),
  };
}

function configServiceProvider() {
  return {
    provide: ConfigService,
    useValue: { get: jest.fn((_key: string, def?: string) => def) },
  };
}

const throttlerGuardOverride = {
  guard: ThrottlerGuard,
  canActivate: () => true,
};

describe(ClientProductsController.name, () => {
  it('GET /client/products is public', async () => {
    const list = {
      execute: jest.fn(async () => ({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      })),
    };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        configServiceProvider(),
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
          useValue: buildUploadMediaMock(),
        },
      ],
      overrideGuards: [
        { guard: JwtAuthGuard, canActivate: () => true },
        throttlerGuardOverride,
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/products')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.listingDisplayTimezone).toBe('UTC');
    expect(list.execute).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /client/products is guarded when auth fails', async () => {
    const create = { execute: jest.fn() };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        configServiceProvider(),
        { provide: CreateProductUseCase, useValue: create },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn(async () => null) },
        },
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
          useValue: buildUploadMediaMock(),
        },
      ],
      overrideGuards: [
        { guard: JwtAuthGuard, canActivate: () => false },
        throttlerGuardOverride,
      ],
    });

    await request(app.getHttpServer())
      .post('/api/v1/client/products')
      .send({})
      .expect(403);

    expect(create.execute).not.toHaveBeenCalled();
    await close();
  });

  it('GET /client/products/my uses paginated response', async () => {
    const listMine = {
      execute: jest.fn(async () => ({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: true,
      })),
    };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        configServiceProvider(),
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn(async () => null) },
        },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetMyProductDetailUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ListMyProductsUseCase, useValue: listMine },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: UploadProductMediaUseCase,
          useValue: buildUploadMediaMock(),
        },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'u1' };
            return true;
          },
        },
        throttlerGuardOverride,
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/products/my?page=2&limit=10')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.listingDisplayTimezone).toBeUndefined();
    expect(listMine.execute).toHaveBeenCalledWith('u1', {
      page: 2,
      limit: 10,
    });
    await close();
  });

  it('GET /client/products/my/:productId returns seller detail', async () => {
    const productId = '22222222-2222-2222-2222-222222222222';
    const detailPayload = {
      id: productId,
      title: 'Mine',
      description: 'd',
      price: 10,
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
      sellerId: 'u1',
      categoryId: 'c1',
      viewCount: 0,
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-02'),
    };
    const getMine = {
      execute: jest.fn(async () => detailPayload),
    };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        configServiceProvider(),
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn(async () => null) },
        },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        { provide: GetMyProductDetailUseCase, useValue: getMine },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: UploadProductMediaUseCase,
          useValue: buildUploadMediaMock(),
        },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'u1' };
            return true;
          },
        },
        throttlerGuardOverride,
      ],
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/client/products/my/${productId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.listingDisplayTimezone).toBeUndefined();
    expect(getMine.execute).toHaveBeenCalledWith('u1', productId);
    await close();
  });

  it('DELETE /client/products/:id requires confirmTitle body', async () => {
    const del = { execute: jest.fn(async () => undefined) };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        configServiceProvider(),
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn(async () => null) },
        },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetMyProductDetailUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: del },
        {
          provide: UploadProductMediaUseCase,
          useValue: buildUploadMediaMock(),
        },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'u1' };
            return true;
          },
        },
        throttlerGuardOverride,
      ],
    });

    const id = '11111111-1111-1111-1111-111111111111';
    await request(app.getHttpServer())
      .delete(`/api/v1/client/products/${id}`)
      .send({})
      .expect(400);

    expect(del.execute).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .delete(`/api/v1/client/products/${id}`)
      .send({ confirmTitle: 'Book' })
      .expect(200);

    expect(del.execute).toHaveBeenCalledWith('u1', id, {
      confirmTitle: 'Book',
    });
    await close();
  });
});
