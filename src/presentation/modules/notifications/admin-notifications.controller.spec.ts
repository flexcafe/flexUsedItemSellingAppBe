import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { AdminNotificationsController } from './admin-notifications.controller.js';
import { ListMyNotificationsUseCase } from '../../../application/use-cases/notifications/list-my-notifications.use-case.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';

describe(AdminNotificationsController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'admin-1', phone: '+959000000000' };
      return true;
    },
  };

  it('GET /admin/dashboard/notifications checks admin and returns rows', async () => {
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const userRepo = {
      findById: jest.fn().mockResolvedValue({ isAdmin: () => true }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminNotificationsController],
      providers: [
        { provide: ListMyNotificationsUseCase, useValue: list },
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/notifications?limit=10')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(userRepo.findById).toHaveBeenCalledWith('admin-1');
    expect(list.execute).toHaveBeenCalledWith('admin-1', 10);
    await close();
  });
});

