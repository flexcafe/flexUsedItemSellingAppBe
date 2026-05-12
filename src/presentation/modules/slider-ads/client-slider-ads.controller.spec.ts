import { jest } from '@jest/globals';
import request from 'supertest';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientSliderAdsController } from './client-slider-ads.controller.js';
import { ListSliderAdsUseCase } from '../../../application/use-cases/slider-ads/list-slider-ads.use-case.js';

describe(ClientSliderAdsController.name, () => {
  it('GET /client/slider-ads lists active ads (public)', async () => {
    const list = { listActive: jest.fn().mockResolvedValue([]) };
    const { app, close } = await createHttpTestApp({
      controllers: [ClientSliderAdsController],
      providers: [{ provide: ListSliderAdsUseCase, useValue: list }],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/slider-ads')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(list.listActive).toHaveBeenCalledTimes(1);
    await close();
  });
});
