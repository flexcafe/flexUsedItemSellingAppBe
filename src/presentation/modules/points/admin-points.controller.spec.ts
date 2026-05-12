import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { AdminPointsController } from './admin-points.controller.js';
import { ManagePointConfigUseCase } from '../../../application/use-cases/points/manage-point-config.use-case.js';
import { ListWithdrawalsUseCase } from '../../../application/use-cases/points/list-withdrawals.use-case.js';
import { ApproveWithdrawalUseCase } from '../../../application/use-cases/points/approve-withdrawal.use-case.js';
import { RejectWithdrawalUseCase } from '../../../application/use-cases/points/reject-withdrawal.use-case.js';
import { MarkWithdrawalPaidUseCase } from '../../../application/use-cases/points/mark-withdrawal-paid.use-case.js';

describe(AdminPointsController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'admin-1', phone: '+959000000000' };
      return true;
    },
  };

  it('GET /admin/dashboard/points/star-config lists configs', async () => {
    const manage = {
      listStarConfigs: jest.fn().mockResolvedValue([]),
      updateStarConfigs: jest.fn(),
      listRankConfigs: jest.fn(),
      updateRankConfigs: jest.fn(),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminPointsController],
      providers: [
        { provide: ManagePointConfigUseCase, useValue: manage },
        { provide: ListWithdrawalsUseCase, useValue: { execute: jest.fn() } },
        { provide: ApproveWithdrawalUseCase, useValue: { execute: jest.fn() } },
        { provide: RejectWithdrawalUseCase, useValue: { execute: jest.fn() } },
        {
          provide: MarkWithdrawalPaidUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/points/star-config')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(manage.listStarConfigs).toHaveBeenCalledWith('admin-1');
    await close();
  });

  it('GET /admin/dashboard/withdrawals lists withdrawals', async () => {
    const listW = { execute: jest.fn().mockResolvedValue([]) };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminPointsController],
      providers: [
        {
          provide: ManagePointConfigUseCase,
          useValue: {
            listStarConfigs: jest.fn(),
            updateStarConfigs: jest.fn(),
            listRankConfigs: jest.fn(),
            updateRankConfigs: jest.fn(),
          },
        },
        { provide: ListWithdrawalsUseCase, useValue: listW },
        { provide: ApproveWithdrawalUseCase, useValue: { execute: jest.fn() } },
        { provide: RejectWithdrawalUseCase, useValue: { execute: jest.fn() } },
        {
          provide: MarkWithdrawalPaidUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/withdrawals?status=PENDING')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(listW.execute).toHaveBeenCalledWith('admin-1', 'PENDING');
    await close();
  });
});
