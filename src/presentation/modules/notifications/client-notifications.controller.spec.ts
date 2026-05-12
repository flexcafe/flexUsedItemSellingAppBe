import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientNotificationsController } from './client-notifications.controller.js';
import { ListMyNotificationsUseCase } from '../../../application/use-cases/notifications/list-my-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '../../../application/use-cases/notifications/mark-notification-read.use-case.js';

describe(ClientNotificationsController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'user-1', phone: '+959123456789' };
      return true;
    },
  };

  it('GET /client/notifications returns rows', async () => {
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const mark = { execute: jest.fn() };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientNotificationsController],
      providers: [
        { provide: ListMyNotificationsUseCase, useValue: list },
        { provide: MarkNotificationReadUseCase, useValue: mark },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/notifications?limit=20')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(list.execute).toHaveBeenCalledWith('user-1', 20);
    await close();
  });

  it('PATCH /client/notifications/:id/read marks read', async () => {
    const list = { execute: jest.fn() };
    const mark = { execute: jest.fn().mockResolvedValue(undefined) };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientNotificationsController],
      providers: [
        { provide: ListMyNotificationsUseCase, useValue: list },
        { provide: MarkNotificationReadUseCase, useValue: mark },
      ],
      overrideGuards: [authGuard],
    });

    const id = '59c148e3-5dc3-42dd-987e-c6b559f0a071';
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/client/notifications/${id}/read`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mark.execute).toHaveBeenCalledWith('user-1', id);
    await close();
  });
});

