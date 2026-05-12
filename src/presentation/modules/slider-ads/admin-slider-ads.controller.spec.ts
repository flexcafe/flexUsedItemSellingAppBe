import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { AdminSliderAdsController } from './admin-slider-ads.controller.js';
import { ListSliderAdsUseCase } from '../../../application/use-cases/slider-ads/list-slider-ads.use-case.js';
import { CreateSliderAdUseCase } from '../../../application/use-cases/slider-ads/create-slider-ad.use-case.js';
import { UpdateSliderAdUseCase } from '../../../application/use-cases/slider-ads/update-slider-ad.use-case.js';
import { DeleteSliderAdUseCase } from '../../../application/use-cases/slider-ads/delete-slider-ad.use-case.js';
import { UploadPublicFileUseCase } from './upload-public-file.use-case.js';
import { SliderAdStatus } from '../../../domain/enums/slider-ad-status.enum.js';

describe(AdminSliderAdsController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'admin-1', phone: '+959000000000' };
      return true;
    },
  };

  it('GET /admin/dashboard/slider-ads lists all ads', async () => {
    const list = { listAll: jest.fn().mockResolvedValue([]), listActive: jest.fn() };
    const { app, close } = await createHttpTestApp({
      controllers: [AdminSliderAdsController],
      providers: [
        { provide: ListSliderAdsUseCase, useValue: list },
        { provide: CreateSliderAdUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateSliderAdUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteSliderAdUseCase, useValue: { execute: jest.fn() } },
        { provide: UploadPublicFileUseCase, useValue: { uploadSliderAdImage: jest.fn() } },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/slider-ads')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(list.listAll).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /admin/dashboard/slider-ads creates ad with multipart file (201)', async () => {
    const list = { listAll: jest.fn(), listActive: jest.fn() };
    const upload = { uploadSliderAdImage: jest.fn().mockResolvedValue('https://cdn/slide.webp') };
    const create = {
      execute: jest.fn().mockResolvedValue({
        id: '59c148e3-5dc3-42dd-987e-c6b559f0a071',
        title: 'Ad',
        imageUrl: 'https://cdn/slide.webp',
        linkUrl: null,
        status: SliderAdStatus.ACTIVE,
        sortOrder: 0,
        startsAt: null,
        endsAt: null,
        createdById: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminSliderAdsController],
      providers: [
        { provide: ListSliderAdsUseCase, useValue: list },
        { provide: CreateSliderAdUseCase, useValue: create },
        { provide: UpdateSliderAdUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteSliderAdUseCase, useValue: { execute: jest.fn() } },
        { provide: UploadPublicFileUseCase, useValue: upload },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/dashboard/slider-ads')
      .field('title', 'Ad')
      .field('status', 'ACTIVE')
      .attach('file', Buffer.from('img'), {
        filename: 'a.webp',
        contentType: 'image/webp',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(upload.uploadSliderAdImage).toHaveBeenCalledTimes(1);
    expect(create.execute).toHaveBeenCalledTimes(1);
    await close();
  });
});

