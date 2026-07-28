import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientProfileController } from './client-profile.controller.js';
import { ChangePasswordUseCase } from '../../../application/use-cases/profile/change-password.use-case.js';
import { DeleteAccountUseCase } from '../../../application/use-cases/profile/delete-account.use-case.js';
import { UploadAvatarUseCase } from '../../../application/use-cases/profile/upload-avatar.use-case.js';
import { LinkFacebookUseCase } from '../../../application/use-cases/profile/link-facebook.use-case.js';
import { SubmitFacebookFollowUseCase } from '../../../application/use-cases/profile/submit-facebook-follow.use-case.js';
import { GetMyFacebookFollowSubmissionUseCase } from '../../../application/use-cases/profile/get-my-facebook-follow-submission.use-case.js';

const profileProviders = (overrides: Record<string, unknown> = {}) => [
  {
    provide: ChangePasswordUseCase,
    useValue: overrides.changePassword ?? { execute: jest.fn() },
  },
  {
    provide: DeleteAccountUseCase,
    useValue: overrides.deleteAccount ?? { execute: jest.fn() },
  },
  {
    provide: UploadAvatarUseCase,
    useValue: overrides.uploadAvatar ?? { execute: jest.fn() },
  },
  {
    provide: LinkFacebookUseCase,
    useValue: overrides.linkFacebook ?? { execute: jest.fn() },
  },
  {
    provide: SubmitFacebookFollowUseCase,
    useValue: overrides.submitFacebookFollow ?? { execute: jest.fn() },
  },
  {
    provide: GetMyFacebookFollowSubmissionUseCase,
    useValue: overrides.getLatestFacebookFollow ?? { execute: jest.fn() },
  },
];

describe(ClientProfileController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'user-1', phone: '+959123456789' };
      return true;
    },
  };

  it('DELETE /client/profile permanently deletes account', async () => {
    const deleteAccount = {
      execute: jest.fn().mockResolvedValue({
        deleted: true,
        deletedAt: new Date('2026-07-29T12:00:00.000Z'),
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientProfileController],
      providers: profileProviders({ deleteAccount }),
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .delete('/api/v1/client/profile')
      .send({ currentPassword: 'secret', confirm: 'DELETE' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe(true);
    expect(deleteAccount.execute).toHaveBeenCalledWith('user-1', {
      currentPassword: 'secret',
      confirm: 'DELETE',
    });

    await close();
  });

  it('DELETE /client/profile requires confirm=DELETE', async () => {
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProfileController],
      providers: profileProviders(),
      overrideGuards: [authGuard],
    });

    await request(app.getHttpServer())
      .delete('/api/v1/client/profile')
      .send({ currentPassword: 'secret', confirm: 'YES' })
      .expect(400);

    await close();
  });

  it('POST /client/profile/avatar uploads multipart and returns avatarUrl', async () => {
    const uploadAvatar = {
      execute: jest.fn().mockResolvedValue('https://cdn/a.png'),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientProfileController],
      providers: profileProviders({ uploadAvatar }),
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/profile/avatar')
      .attach('file', Buffer.from('x'), {
        filename: 'a.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ avatarUrl: 'https://cdn/a.png' });
    expect(uploadAvatar.execute).toHaveBeenCalledTimes(1);

    await close();
  });

  it('POST /client/profile/facebook/link validates required fields (400)', async () => {
    const { app, close } = await createHttpTestApp({
      controllers: [ClientProfileController],
      providers: profileProviders(),
      overrideGuards: [authGuard],
    });

    await request(app.getHttpServer())
      .post('/api/v1/client/profile/facebook/link')
      .send({})
      .expect(400);

    await close();
  });

  it('POST /client/profile/facebook/follow-submissions accepts multipart screenshot', async () => {
    const submitFacebookFollow = {
      execute: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        userNickname: 'Nick',
        userPhone: '+959123456789',
        facebookName: 'John',
        facebookProfileUrl: 'https://facebook.com/p',
        facebookPageUrl: 'https://facebook.com/page',
        screenshotUrl: 'https://cdn/s.png',
        status: 'PENDING',
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientProfileController],
      providers: profileProviders({ submitFacebookFollow }),
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/profile/facebook/follow-submissions')
      .field('facebookName', 'John')
      .field('facebookProfileUrl', 'https://facebook.com/p')
      .field('facebookPageUrl', 'https://facebook.com/page')
      .attach('screenshot', Buffer.from('img'), {
        filename: 's.webp',
        contentType: 'image/webp',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(submitFacebookFollow.execute).toHaveBeenCalledTimes(1);
    await close();
  });

  it('GET /client/profile/facebook/follow-submissions/latest returns latest row', async () => {
    const getLatestFacebookFollow = {
      execute: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        userNickname: 'Nick',
        userPhone: '+959123456789',
        facebookName: 'John',
        facebookProfileUrl: 'https://facebook.com/p',
        facebookPageUrl: 'https://facebook.com/page',
        screenshotUrl: 'https://cdn/s.png',
        status: 'PENDING',
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientProfileController],
      providers: profileProviders({ getLatestFacebookFollow }),
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/profile/facebook/follow-submissions/latest')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(getLatestFacebookFollow.execute).toHaveBeenCalledTimes(1);
    await close();
  });
});
