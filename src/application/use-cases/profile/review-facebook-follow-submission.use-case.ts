import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FACEBOOK_REPOSITORY,
  type IFacebookRepository,
} from '../../../domain/repositories/facebook.repository.interface.js';
import { FacebookFollowSubmissionStatus } from '../../../domain/enums/facebook-follow-submission-status.enum.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { FacebookFollowSubmissionDto } from '../../dtos/profile/facebook-follow-submission.dto.js';
import { ReviewFacebookFollowDto } from '../../dtos/profile/review-facebook-follow.dto.js';

const FACEBOOK_FOLLOW_REWARD_POINTS = 500;

@Injectable()
export class ReviewFacebookFollowSubmissionUseCase {
  constructor(
    @Inject(FACEBOOK_REPOSITORY)
    private readonly facebookRepository: IFacebookRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async approve(
    adminId: string,
    submissionId: string,
    dto: ReviewFacebookFollowDto,
  ): Promise<FacebookFollowSubmissionDto> {
    await this.assertAdmin(adminId);
    const row = await this.requirePendingSubmission(submissionId);

    const reward =
      await this.facebookRepository.grantFacebookFollowRewardIfEligible({
        userId: row.userId,
        submissionId: row.id,
        points: FACEBOOK_FOLLOW_REWARD_POINTS,
      });
    if (!reward.rewarded) {
      throw new ConflictException(
        'Facebook follow reward has already been granted for this account',
      );
    }

    const reviewed =
      await this.facebookRepository.reviewFacebookFollowSubmission({
        submissionId: row.id,
        adminId,
        status: FacebookFollowSubmissionStatus.APPROVED,
        adminNote: dto.adminNote,
      });

    await this.userRepository.createNotification({
      userId: reviewed.userId,
      eventKey: 'POINTS_FACEBOOK_FOLLOW_REWARDED_CLIENT',
      metadata: {
        submissionId: reviewed.id,
        points: FACEBOOK_FOLLOW_REWARD_POINTS,
      },
      title: 'Facebook follow reward approved',
      message: `Admin approved your Facebook follow proof. You received ${FACEBOOK_FOLLOW_REWARD_POINTS} points.`,
      referenceId: reviewed.id,
    });

    return new FacebookFollowSubmissionDto(reviewed);
  }

  async reject(
    adminId: string,
    submissionId: string,
    dto: ReviewFacebookFollowDto,
  ): Promise<FacebookFollowSubmissionDto> {
    await this.assertAdmin(adminId);
    const row = await this.requirePendingSubmission(submissionId);

    const reviewed =
      await this.facebookRepository.reviewFacebookFollowSubmission({
        submissionId: row.id,
        adminId,
        status: FacebookFollowSubmissionStatus.REJECTED,
        adminNote: dto.adminNote,
      });

    await this.userRepository.createNotification({
      userId: reviewed.userId,
      eventKey: 'FACEBOOK_FOLLOW_REJECTED_CLIENT',
      metadata: {
        submissionId: reviewed.id,
        adminNote: reviewed.adminNote,
      },
      title: 'Facebook follow proof rejected',
      message:
        reviewed.adminNote ??
        'Your Facebook follow proof could not be approved. Please submit a valid screenshot and profile information.',
      referenceId: reviewed.id,
    });

    return new FacebookFollowSubmissionDto(reviewed);
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.userRepository.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  private async requirePendingSubmission(submissionId: string): Promise<{
    id: string;
    userId: string;
    status: FacebookFollowSubmissionStatus;
  }> {
    const row =
      await this.facebookRepository.findFacebookFollowSubmissionById(
        submissionId,
      );
    if (!row) {
      throw new NotFoundException('Facebook follow submission not found');
    }
    if (row.status !== FacebookFollowSubmissionStatus.PENDING) {
      throw new ConflictException('Only pending submissions can be reviewed');
    }
    return row;
  }
}
