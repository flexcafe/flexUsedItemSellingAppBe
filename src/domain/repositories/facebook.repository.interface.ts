import { RankTier } from '../enums/rank-tier.enum.js';
import { FacebookFollowSubmissionStatus } from '../enums/facebook-follow-submission-status.enum.js';

export interface LinkFacebookData {
  userId: string;
  facebookId: string;
  facebookName: string;
  facebookProfileUrl: string;
}

export interface CreateFacebookFollowSubmissionData {
  userId: string;
  facebookName: string;
  facebookProfileUrl: string;
  facebookPageUrl: string;
  screenshotUrl: string;
}

export interface FacebookFollowSubmissionData {
  id: string;
  userId: string;
  userNickname: string;
  userPhone: string;
  facebookName: string;
  facebookProfileUrl: string;
  facebookPageUrl: string;
  screenshotUrl: string;
  status: FacebookFollowSubmissionStatus;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewFacebookFollowSubmissionData {
  submissionId: string;
  adminId: string;
  status: FacebookFollowSubmissionStatus.APPROVED | FacebookFollowSubmissionStatus.REJECTED;
  adminNote?: string;
}

export interface IFacebookRepository {
  setFacebookLink(data: LinkFacebookData): Promise<void>;
  createFacebookFollowSubmission(
    data: CreateFacebookFollowSubmissionData,
  ): Promise<FacebookFollowSubmissionData>;
  findLatestFacebookFollowSubmissionByUserId(
    userId: string,
  ): Promise<FacebookFollowSubmissionData | null>;
  findFacebookFollowSubmissionById(
    submissionId: string,
  ): Promise<FacebookFollowSubmissionData | null>;
  listFacebookFollowSubmissions(
    status?: FacebookFollowSubmissionStatus,
  ): Promise<FacebookFollowSubmissionData[]>;
  reviewFacebookFollowSubmission(
    data: ReviewFacebookFollowSubmissionData,
  ): Promise<FacebookFollowSubmissionData>;
  grantFacebookFollowRewardIfEligible(params: {
    userId: string;
    submissionId: string;
    points: number;
  }): Promise<{
    rewarded: boolean;
    newTotalPoints: number | null;
    newRank: RankTier | null;
  }>;
}

export const FACEBOOK_REPOSITORY = Symbol('FACEBOOK_REPOSITORY');
