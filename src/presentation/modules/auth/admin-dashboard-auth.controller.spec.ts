import { jest } from '@jest/globals';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AdminDashboardAuthController } from './admin-dashboard-auth.controller.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js';
import { ListKbzPayVerificationRequestedUseCase } from '../../../application/use-cases/auth/list-kbzpay-verification-requested.use-case.js';
import { ListKbzPayMoneyCheckUseCase } from '../../../application/use-cases/auth/list-kbzpay-money-check.use-case.js';
import { ListKbzPayVerifiedUsersUseCase } from '../../../application/use-cases/auth/list-kbzpay-verified-users.use-case.js';
import { ListKbzPayRegisteredAccountsUseCase } from '../../../application/use-cases/auth/list-kbzpay-registered-accounts.use-case.js';
import { SendKbzPayInstructionUseCase } from '../../../application/use-cases/auth/send-kbzpay-instruction.use-case.js';
import { AdminVerifyKbzPayUseCase } from '../../../application/use-cases/auth/admin-verify-kbzpay.use-case.js';

describe(AdminDashboardAuthController.name, () => {
  it(
    'POST /admin/dashboard/auth/login validates body (400)',
    async () => {
      const { app, close } = await createHttpTestApp({
        controllers: [AdminDashboardAuthController],
        providers: [
          { provide: LoginUseCase, useValue: { loginAdmin: jest.fn() } },
          {
            provide: ListKbzPayVerificationRequestedUseCase,
            useValue: { execute: jest.fn() },
          },
          {
            provide: ListKbzPayMoneyCheckUseCase,
            useValue: { execute: jest.fn() },
          },
          {
            provide: ListKbzPayVerifiedUsersUseCase,
            useValue: { execute: jest.fn() },
          },
          {
            provide: ListKbzPayRegisteredAccountsUseCase,
            useValue: { execute: jest.fn() },
          },
          {
            provide: SendKbzPayInstructionUseCase,
            useValue: { execute: jest.fn() },
          },
          {
            provide: AdminVerifyKbzPayUseCase,
            useValue: { execute: jest.fn() },
          },
        ],
        overrideGuards: [{ guard: ThrottlerGuard, canActivate: () => true }],
      });

      await request(app.getHttpServer())
        .post('/api/v1/admin/dashboard/auth/login')
        .send({})
        .expect(400);

      await close();
    },
    20_000,
  );

  it('POST /admin/dashboard/auth/login returns success envelope', async () => {
    const loginUseCase = { loginAdmin: jest.fn() };
    loginUseCase.loginAdmin.mockResolvedValue({
      user: { id: 'admin-1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });

    const { app, close } = await createHttpTestApp({
      controllers: [AdminDashboardAuthController],
      providers: [
        { provide: LoginUseCase, useValue: loginUseCase },
        {
          provide: ListKbzPayVerificationRequestedUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListKbzPayMoneyCheckUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListKbzPayVerifiedUsersUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListKbzPayRegisteredAccountsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SendKbzPayInstructionUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: AdminVerifyKbzPayUseCase, useValue: { execute: jest.fn() } },
      ],
      overrideGuards: [{ guard: ThrottlerGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/dashboard/auth/login')
      .send({ email: 'admin@example.com', password: 'pw' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(loginUseCase.loginAdmin).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /admin/dashboard/auth/kbzpay/:userId/send-instruction is protected (200 with auth override)', async () => {
    const send = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    const { app, close } = await createHttpTestApp({
      controllers: [AdminDashboardAuthController],
      providers: [
        { provide: LoginUseCase, useValue: { loginAdmin: jest.fn() } },
        {
          provide: ListKbzPayVerificationRequestedUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListKbzPayMoneyCheckUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListKbzPayVerifiedUsersUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListKbzPayRegisteredAccountsUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: SendKbzPayInstructionUseCase, useValue: send },
        { provide: AdminVerifyKbzPayUseCase, useValue: { execute: jest.fn() } },
      ],
      overrideGuards: [
        { guard: ThrottlerGuard, canActivate: () => true },
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'admin-1', phone: '+959000000000' };
            return true;
          },
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .post(
        '/api/v1/admin/dashboard/auth/kbzpay/59c148e3-5dc3-42dd-987e-c6b559f0a071/send-instruction',
      )
      .send({ adminPhoneForTransfer: '+959111111111', adminNote: 'ok' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(send.execute).toHaveBeenCalledTimes(1);
    await close();
  });
});
