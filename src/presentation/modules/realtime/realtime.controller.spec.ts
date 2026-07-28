import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { RealtimeController } from './realtime.controller.js';
import { PusherService } from '../../../infrastructure/realtime/pusher.service.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';

describe(RealtimeController.name, () => {
  it('POST /client/pusher/auth forbids mismatched channel', async () => {
    const pusher = {
      authorizePrivateChannel: jest.fn().mockReturnValue({ auth: 'x' }),
    };
    const userRepo = { findById: jest.fn() };

    const { app, close } = await createHttpTestApp({
      controllers: [RealtimeController],
      providers: [
        { provide: PusherService, useValue: pusher },
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'user-1', phone: '+9591' };
            return true;
          },
        },
      ],
    });

    await request(app.getHttpServer())
      .post('/api/v1/client/pusher/auth')
      .send({ socket_id: '1.1', channel_name: 'private-user-other' })
      .expect(403);

    await close();
  });

  it('POST /client/pusher/auth authorizes correct channel', async () => {
    const pusher = {
      authorizePrivateChannel: jest.fn().mockReturnValue({ auth: 'ok' }),
    };
    const userRepo = { findById: jest.fn() };

    const { app, close } = await createHttpTestApp({
      controllers: [RealtimeController],
      providers: [
        { provide: PusherService, useValue: pusher },
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'user-1', phone: '+9591' };
            return true;
          },
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/pusher/auth')
      .send({ socket_id: '1.1', channel_name: 'private-user-user-1' })
      .expect(201);

    expect(res.body).toEqual(expect.objectContaining({ auth: 'ok' }));
    expect(pusher.authorizePrivateChannel).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /admin/dashboard/pusher/auth requires admin user', async () => {
    const pusher = {
      authorizePrivateChannel: jest.fn().mockReturnValue({ auth: 'ok' }),
    };
    const userRepo = {
      findById: jest.fn().mockResolvedValue({
        isAdmin: () => true,
        isActiveUser: () => true,
      }),
      getAdminRoleByUserId: jest.fn().mockResolvedValue({
        id: 'role-root',
        name: 'ROOT_ADMIN',
        isSystem: true,
        permissions: [],
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [RealtimeController],
      providers: [
        { provide: PusherService, useValue: pusher },
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'admin-1', phone: '+9590' };
            return true;
          },
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/dashboard/pusher/auth')
      .send({ socket_id: '1.1', channel_name: 'private-user-admin-1' })
      .expect(201);

    expect(res.body).toEqual(expect.objectContaining({ auth: 'ok' }));
    expect(userRepo.findById).toHaveBeenCalledWith('admin-1');
    await close();
  });
});
