import { jest } from '@jest/globals';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientPointsController } from './client-points.controller.js';
import { GetPointsSummaryUseCase } from '../../../application/use-cases/points/get-points-summary.use-case.js';
import { GetTransactionStatsUseCase } from '../../../application/use-cases/points/get-transaction-stats.use-case.js';
import { GetPublicUserProfileUseCase } from '../../../application/use-cases/points/get-public-user-profile.use-case.js';
import { CreateTransactionReviewUseCase } from '../../../application/use-cases/points/create-transaction-review.use-case.js';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/points/request-withdrawal.use-case.js';
import { ListMyWithdrawalsUseCase } from '../../../application/use-cases/points/list-my-withdrawals.use-case.js';
import { ListClientRankConfigUseCase } from '../../../application/use-cases/points/list-client-rank-config.use-case.js';

describe(ClientPointsController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'user-1', phone: '+959123456789' };
      return true;
    },
  };

  it('GET /client/profile/rank-config is public (200)', async () => {
    const rank = { execute: jest.fn().mockResolvedValue([]) };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientPointsController],
      providers: [
        { provide: GetPointsSummaryUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetTransactionStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPublicUserProfileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateTransactionReviewUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: RequestWithdrawalUseCase, useValue: { execute: jest.fn() } },
        { provide: ListMyWithdrawalsUseCase, useValue: { execute: jest.fn() } },
        { provide: ListClientRankConfigUseCase, useValue: rank },
      ],
      overrideGuards: [{ guard: ThrottlerGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/profile/rank-config')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(rank.execute).toHaveBeenCalledTimes(1);
    await close();
  });

  it('GET /client/profile/points returns summary (200)', async () => {
    const summary = {
      execute: jest.fn().mockResolvedValue({ totalPoints: 0 }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientPointsController],
      providers: [
        { provide: GetPointsSummaryUseCase, useValue: summary },
        {
          provide: GetTransactionStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPublicUserProfileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateTransactionReviewUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: RequestWithdrawalUseCase, useValue: { execute: jest.fn() } },
        { provide: ListMyWithdrawalsUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListClientRankConfigUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [
        { guard: ThrottlerGuard, canActivate: () => true },
        authGuard,
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/profile/points')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(summary.execute).toHaveBeenCalledWith('user-1');
    await close();
  });

  it('POST /client/profile/withdrawals uses throttler and creates request (201)', async () => {
    const reqW = {
      execute: jest
        .fn()
        .mockResolvedValue({ id: 'w1', amount: 10, status: 'PENDING' }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientPointsController],
      providers: [
        { provide: GetPointsSummaryUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetTransactionStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPublicUserProfileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateTransactionReviewUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: RequestWithdrawalUseCase, useValue: reqW },
        { provide: ListMyWithdrawalsUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListClientRankConfigUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [
        { guard: ThrottlerGuard, canActivate: () => true },
        authGuard,
      ],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/profile/withdrawals')
      .send({ amount: 10 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(reqW.execute).toHaveBeenCalledTimes(1);
    await close();
  });
});
