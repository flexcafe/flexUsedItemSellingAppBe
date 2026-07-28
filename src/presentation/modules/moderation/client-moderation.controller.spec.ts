import { jest } from '@jest/globals';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientModerationController } from './client-moderation.controller.js';
import { SubmitContentReportUseCase } from '../../../application/use-cases/moderation/submit-content-report.use-case.js';
import { ListMyContentReportsUseCase } from '../../../application/use-cases/moderation/list-my-content-reports.use-case.js';
import { BlockUserUseCase } from '../../../application/use-cases/moderation/block-user.use-case.js';
import { UnblockUserUseCase } from '../../../application/use-cases/moderation/unblock-user.use-case.js';
import { ListBlockedUsersUseCase } from '../../../application/use-cases/moderation/list-blocked-users.use-case.js';
import { ListBlockedUserIdsUseCase } from '../../../application/use-cases/moderation/list-blocked-user-ids.use-case.js';
import { ContentReportReason } from '../../../domain/enums/content-report-reason.enum.js';
import { ContentReportTargetType } from '../../../domain/enums/content-report-target-type.enum.js';

describe(ClientModerationController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'user-1', phone: '+959123456789' };
      return true;
    },
  };

  function baseProviders(
    overrides: Record<string, { execute: jest.Mock }> = {},
  ) {
    return [
      {
        provide: SubmitContentReportUseCase,
        useValue: overrides.submit ?? { execute: jest.fn() },
      },
      {
        provide: ListMyContentReportsUseCase,
        useValue: overrides.listMine ?? { execute: jest.fn() },
      },
      {
        provide: BlockUserUseCase,
        useValue: overrides.block ?? { execute: jest.fn() },
      },
      {
        provide: UnblockUserUseCase,
        useValue: overrides.unblock ?? { execute: jest.fn() },
      },
      {
        provide: ListBlockedUsersUseCase,
        useValue: overrides.listBlocks ?? { execute: jest.fn() },
      },
      {
        provide: ListBlockedUserIdsUseCase,
        useValue: overrides.listIds ?? { execute: jest.fn() },
      },
    ];
  }

  it('POST /client/moderation/reports submits report (201)', async () => {
    const submit = {
      execute: jest.fn().mockResolvedValue({ id: 'report-1' }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientModerationController],
      providers: baseProviders({ submit }),
      overrideGuards: [
        authGuard,
        { guard: ThrottlerGuard, canActivate: () => true },
      ],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/moderation/reports')
      .send({
        targetType: ContentReportTargetType.LISTING,
        targetId: 'a1111111-1111-4111-8111-111111111111',
        reason: ContentReportReason.OBJECTIONABLE_CONTENT,
        details: 'bad',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(submit.execute).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        targetType: ContentReportTargetType.LISTING,
      }),
    );
    await close();
  });

  it('POST /client/moderation/blocks blocks user (201)', async () => {
    const block = {
      execute: jest.fn().mockResolvedValue({
        id: 'b1',
        blockedUserId: 'b2222222-2222-4222-8222-222222222222',
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientModerationController],
      providers: baseProviders({ block }),
      overrideGuards: [
        authGuard,
        { guard: ThrottlerGuard, canActivate: () => true },
      ],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/moderation/blocks')
      .send({
        blockedUserId: 'b2222222-2222-4222-8222-222222222222',
        reason: 'abuse',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(block.execute).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        blockedUserId: 'b2222222-2222-4222-8222-222222222222',
      }),
    );
    await close();
  });

  it('GET /client/moderation/blocks/ids returns excluded ids (200)', async () => {
    const listIds = {
      execute: jest.fn().mockResolvedValue(['a', 'b']),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientModerationController],
      providers: baseProviders({ listIds }),
      overrideGuards: [
        authGuard,
        { guard: ThrottlerGuard, canActivate: () => true },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/moderation/blocks/ids')
      .expect(200);

    expect(res.body.data).toEqual(['a', 'b']);
    expect(listIds.execute).toHaveBeenCalledWith('user-1');
    await close();
  });
});
