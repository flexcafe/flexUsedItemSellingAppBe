import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ReviewFacebookFollowSubmissionUseCase } from './review-facebook-follow-submission.use-case.js';
import type { IFacebookRepository } from '../../../domain/repositories/facebook.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { FacebookFollowSubmissionStatus } from '../../../domain/enums/facebook-follow-submission-status.enum.js';

describe(ReviewFacebookFollowSubmissionUseCase.name, () => {
  it('rejects approve when reward already granted', async () => {
    const facebookRepo = {
      findFacebookFollowSubmissionById: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        userNickname: 'Nick',
        userPhone: '+9591',
        facebookName: 'John',
        facebookProfileUrl: 'https://facebook.com/p',
        facebookPageUrl: 'https://facebook.com/page',
        screenshotUrl: 'https://cdn/s.png',
        status: FacebookFollowSubmissionStatus.PENDING,
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      grantFacebookFollowRewardIfEligible: jest.fn().mockResolvedValue({
        rewarded: false,
        newTotalPoints: null,
        newRank: null,
      }),
      reviewFacebookFollowSubmission: jest.fn(),
    } as unknown as IFacebookRepository;

    const userRepo = {
      findById: jest.fn().mockResolvedValue({ isAdmin: () => true }),
      createNotification: jest.fn(),
    } as unknown as IUserRepository;

    const useCase = new ReviewFacebookFollowSubmissionUseCase(
      facebookRepo,
      userRepo,
    );
    await expect(
      useCase.approve('admin-1', 'sub-1', { adminNote: 'ok' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects approve when user is not admin', async () => {
    const facebookRepo = {
      findFacebookFollowSubmissionById: jest.fn(),
      grantFacebookFollowRewardIfEligible: jest.fn(),
      reviewFacebookFollowSubmission: jest.fn(),
    } as unknown as IFacebookRepository;

    const userRepo = {
      findById: jest.fn().mockResolvedValue({ isAdmin: () => false }),
      createNotification: jest.fn(),
    } as unknown as IUserRepository;

    const useCase = new ReviewFacebookFollowSubmissionUseCase(
      facebookRepo,
      userRepo,
    );
    await expect(
      useCase.approve('admin-1', 'sub-1', { adminNote: 'ok' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
