import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class ListFacebookFollowSubmissionsUseCase {
  constructor(
    @Inject(FACEBOOK_REPOSITORY)
    private readonly facebookRepository: IFacebookRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    status?: FacebookFollowSubmissionStatus,
  ): Promise<FacebookFollowSubmissionDto[]> {
    const admin = await this.userRepository.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }

    const rows = await this.facebookRepository.listFacebookFollowSubmissions(
      status,
    );
    return rows.map((row) => new FacebookFollowSubmissionDto(row));
  }
}
