import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientProductsController } from './client-products.controller.js';
import { CreateProductUseCase } from '../../../application/use-cases/product/create-product.use-case.js';
import { ListProductsUseCase } from '../../../application/use-cases/product/list-products.use-case.js';
import { GetProductDetailUseCase } from '../../../application/use-cases/product/get-product-detail.use-case.js';
import { ListMyProductsUseCase } from '../../../application/use-cases/product/list-my-products.use-case.js';
import { UpdateProductUseCase } from '../../../application/use-cases/product/update-product.use-case.js';
import { DeleteProductUseCase } from '../../../application/use-cases/product/delete-product.use-case.js';

describe(ClientProductsController.name, () => {
  it('GET /client/products is public', async () => {
    const list = {
      execute: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: ListProductsUseCase, useValue: list },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
      ],
      overrideGuards: [{ guard: JwtAuthGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/products')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(list.execute).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /client/products is guarded when auth fails', async () => {
    const create = { execute: jest.fn() };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        { provide: CreateProductUseCase, useValue: create },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(null) },
        },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
      ],
      overrideGuards: [{ guard: JwtAuthGuard, canActivate: () => false }],
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
      execute: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: true,
      }),
    };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(null) },
        },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        { provide: ListMyProductsUseCase, useValue: listMine },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: { execute: jest.fn() } },
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
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/products/my?page=2&limit=10')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(listMine.execute).toHaveBeenCalledWith('u1', {
      page: 2,
      limit: 10,
    });
    await close();
  });

  it('DELETE /client/products/:id requires confirmTitle body', async () => {
    const del = { execute: jest.fn().mockResolvedValue(undefined) };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProductsController],
      providers: [
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListProductsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(null) },
        },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        { provide: ListMyProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductUseCase, useValue: del },
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
