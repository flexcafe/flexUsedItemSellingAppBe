import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { CreateCategoryUseCase } from '../../../application/use-cases/category/create-category.use-case.js';
import { UpdateCategoryUseCase } from '../../../application/use-cases/category/update-category.use-case.js';
import { DeleteCategoryUseCase } from '../../../application/use-cases/category/delete-category.use-case.js';
import { ListCategoriesUseCase } from '../../../application/use-cases/category/list-categories.use-case.js';
import { GetCategoryUseCase } from '../../../application/use-cases/category/get-category.use-case.js';
import { UploadCategoryIconUseCase } from '../../../application/use-cases/category/upload-category-icon.use-case.js';

describe(AdminCategoriesController.name, () => {
  it('GET /admin/dashboard/categories returns list', async () => {
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const { app, close } = await createHttpTestApp({
      controllers: [AdminCategoriesController],
      providers: [
        { provide: CreateCategoryUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateCategoryUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteCategoryUseCase, useValue: { execute: jest.fn() } },
        { provide: ListCategoriesUseCase, useValue: list },
        { provide: GetCategoryUseCase, useValue: { execute: jest.fn() } },
        {
          provide: UploadCategoryIconUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'admin-1' };
            return true;
          },
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/categories')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(list.execute).toHaveBeenCalledTimes(1);
    await close();
  });
});
