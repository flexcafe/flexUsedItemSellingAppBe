import { jest } from '@jest/globals';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { ClientLegalController } from './client-legal.controller.js';
import { GetActiveTermsUseCase } from '../../../application/use-cases/moderation/get-active-terms.use-case.js';
import { AcceptTermsUseCase } from '../../../application/use-cases/moderation/accept-terms.use-case.js';
import { GetTermsAcceptanceStatusUseCase } from '../../../application/use-cases/moderation/get-terms-acceptance-status.use-case.js';

describe(ClientLegalController.name, () => {
  it('GET /client/legal/terms is public (200)', async () => {
    const getTerms = {
      execute: jest.fn().mockResolvedValue({
        version: '1.0',
        title: 'Terms of Use',
        content: 'Zero tolerance',
        publishedAt: new Date().toISOString(),
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientLegalController],
      providers: [
        { provide: GetActiveTermsUseCase, useValue: getTerms },
        { provide: AcceptTermsUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetTermsAcceptanceStatusUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [
        { guard: JwtAuthGuard, canActivate: () => true },
        { guard: ThrottlerGuard, canActivate: () => true },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/client/legal/terms')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(getTerms.execute).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /client/legal/terms/accept uses authenticated user', async () => {
    const accept = {
      execute: jest.fn().mockResolvedValue({
        currentVersion: '1.0',
        acceptedVersion: '1.0',
        acceptedAt: new Date().toISOString(),
        needsAcceptance: false,
      }),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [ClientLegalController],
      providers: [
        { provide: GetActiveTermsUseCase, useValue: { execute: jest.fn() } },
        { provide: AcceptTermsUseCase, useValue: accept },
        {
          provide: GetTermsAcceptanceStatusUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
      overrideGuards: [
        {
          guard: JwtAuthGuard,
          canActivate: (ctx: unknown) => {
            const req = (ctx as any).switchToHttp().getRequest();
            req.user = { sub: 'user-1', phone: '+959' };
            return true;
          },
        },
        { guard: ThrottlerGuard, canActivate: () => true },
      ],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/client/legal/terms/accept')
      .send({ termsVersion: '1.0' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(accept.execute).toHaveBeenCalledWith('user-1', {
      termsVersion: '1.0',
    });
    await close();
  });
});
