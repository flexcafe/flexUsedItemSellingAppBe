import { jest } from '@jest/globals';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { RegisterUseCase } from '../../../application/use-cases/auth/register.use-case.js';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js';
import { SendPhoneOtpUseCase } from '../../../application/use-cases/auth/send-phone-otp.use-case.js';
import { VerifyPhoneOtpUseCase } from '../../../application/use-cases/auth/verify-phone-otp.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/auth/send-email-verification.use-case.js';
import { VerifyEmailVerificationUseCase } from '../../../application/use-cases/auth/verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from '../../../application/use-cases/auth/request-kbzpay-verification.use-case.js';
import { SubmitKbzPayTransactionUseCase } from '../../../application/use-cases/auth/submit-kbzpay-transaction.use-case.js';
import { GetCurrentUserProfileUseCase } from '../../../application/use-cases/auth/get-current-user-profile.use-case.js';
import { RequestForgotPasswordUseCase } from '../../../application/use-cases/auth/request-forgot-password.use-case.js';
import { ResetPasswordUseCase } from '../../../application/use-cases/auth/reset-password.use-case.js';

function authControllerProviders(
  extra: { provide: unknown; useValue: unknown }[] = [],
) {
  return [
    { provide: RegisterUseCase, useValue: { execute: jest.fn() } },
    { provide: LoginUseCase, useValue: { loginClient: jest.fn() } },
    { provide: SendPhoneOtpUseCase, useValue: { execute: jest.fn() } },
    { provide: VerifyPhoneOtpUseCase, useValue: { execute: jest.fn() } },
    {
      provide: SendEmailVerificationUseCase,
      useValue: { execute: jest.fn() },
    },
    {
      provide: VerifyEmailVerificationUseCase,
      useValue: { execute: jest.fn() },
    },
    {
      provide: RequestKbzPayVerificationUseCase,
      useValue: { execute: jest.fn() },
    },
    {
      provide: SubmitKbzPayTransactionUseCase,
      useValue: { execute: jest.fn() },
    },
    { provide: GetCurrentUserProfileUseCase, useValue: { execute: jest.fn() } },
    {
      provide: RequestForgotPasswordUseCase,
      useValue: { execute: jest.fn() },
    },
    { provide: ResetPasswordUseCase, useValue: { execute: jest.fn() } },
    ...extra,
  ];
}

describe(AuthController.name, () => {
  it('POST /client/auth/register validates body (400)', async () => {
    const { app, close } = await createHttpTestApp({
      controllers: [AuthController],
      providers: authControllerProviders(),
      overrideGuards: [
        { guard: ThrottlerGuard, canActivate: () => true },
        { guard: JwtAuthGuard, canActivate: () => true },
      ],
    });

    await request(app.getHttpServer())
      .post('/api/v1/client/auth/register')
      .send({})
      .expect(400);

    await close();
  });

  it('POST /client/auth/login returns ApiResponseDto success envelope', async () => {
    const loginUseCase = { loginClient: jest.fn() };
    loginUseCase.loginClient.mockResolvedValue({
      user: { id: 'u1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });

    const { app, close } = await createHttpTestApp({
      controllers: [AuthController],
      providers: authControllerProviders([
        { provide: LoginUseCase, useValue: loginUseCase },
      ]),
      overrideGuards: [{ guard: ThrottlerGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/auth/login')
      .send({ phone: '+959123456789', password: 'pw' })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Login successful',
        data: expect.any(Object),
      }),
    );
    expect(loginUseCase.loginClient).toHaveBeenCalledTimes(1);

    await close();
  });

  it('GET /client/auth/me requires auth unless guard overridden (200 with override)', async () => {
    const getMe = { execute: jest.fn().mockResolvedValue({ id: 'u1' }) };

    const { app, close } = await createHttpTestApp({
      controllers: [AuthController],
      providers: authControllerProviders([
        { provide: GetCurrentUserProfileUseCase, useValue: getMe },
      ]),
      overrideGuards: [
        { guard: ThrottlerGuard, canActivate: () => true },
        {
          guard: JwtAuthGuard,
          canActivate: (ctx) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'u1', phone: '+959123456789' };
            return true;
          },
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/auth/me')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(getMe.execute).toHaveBeenCalledTimes(1);

    await close();
  });

  it('POST /client/auth/forgot-password returns success envelope', async () => {
    const forgot = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        action: 'PASSWORD_RESET_OTP_SENT',
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AuthController],
      providers: authControllerProviders([
        { provide: RequestForgotPasswordUseCase, useValue: forgot },
      ]),
      overrideGuards: [{ guard: ThrottlerGuard, canActivate: () => true }],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/auth/forgot-password')
      .send({ phone: '+959123456789' })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Password reset OTP sent',
      }),
    );
    expect(forgot.execute).toHaveBeenCalledTimes(1);

    await close();
  });
});
