import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { AdminFacebookFollowController } from './admin-facebook-follow.controller.js';
import { ListFacebookFollowSubmissionsUseCase } from '../../../application/use-cases/profile/list-facebook-follow-submissions.use-case.js';
import { ReviewFacebookFollowSubmissionUseCase } from '../../../application/use-cases/profile/review-facebook-follow-submission.use-case.js';

describe(AdminFacebookFollowController.name, () => {
  const authGuard = {
    guard: JwtAuthGuard,
    canActivate: (ctx: unknown) => {
      const req = (ctx as any).switchToHttp().getRequest();
      req.user = { sub: 'admin-1', phone: '+959000000000' };
      return true;
    },
  };

  it('GET /admin/dashboard/facebook-follow/submissions returns rows', async () => {
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const review = { approve: jest.fn(), reject: jest.fn() };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminFacebookFollowController],
      providers: [
        { provide: ListFacebookFollowSubmissionsUseCase, useValue: list },
        { provide: ReviewFacebookFollowSubmissionUseCase, useValue: review },
      ],
      overrideGuards: [authGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/facebook-follow/submissions?status=PENDING')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(list.execute).toHaveBeenCalledTimes(1);
    await close();
  });

  it('POST /admin/dashboard/facebook-follow/submissions/:id/approve calls use-case', async () => {
    const list = { execute: jest.fn() };
    const review = {
      approve: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        userNickname: 'Nick',
        userPhone: '+9591',
        facebookName: 'John',
        facebookProfileUrl: 'https://facebook.com/p',
        facebookPageUrl: 'https://facebook.com/page',
        screenshotUrl: 'https://cdn/s.png',
        status: 'APPROVED',
        adminNote: null,
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      reject: jest.fn(),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminFacebookFollowController],
      providers: [
        { provide: ListFacebookFollowSubmissionsUseCase, useValue: list },
        { provide: ReviewFacebookFollowSubmissionUseCase, useValue: review },
      ],
      overrideGuards: [authGuard],
    });

    const submissionId = '59c148e3-5dc3-42dd-987e-c6b559f0a071';
    const res = await request(app.getHttpServer())
      .post(
        `/api/v1/admin/dashboard/facebook-follow/submissions/${submissionId}/approve`,
      )
      .send({ adminNote: 'ok' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(review.approve).toHaveBeenCalledTimes(1);
    await close();
  });
});

