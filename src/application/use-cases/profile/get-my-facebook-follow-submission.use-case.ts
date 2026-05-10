import { Inject, Injectable } from '@nestjs/common';
import {
  FACEBOOK_REPOSITORY,
  type IFacebookRepository,
} from '../../../domain/repositories/facebook.repository.interface.js';
import { FacebookFollowSubmissionDto } from '../../dtos/profile/facebook-follow-submission.dto.js';

@Injectable()
export class GetMyFacebookFollowSubmissionUseCase {
  constructor(
    @Inject(FACEBOOK_REPOSITORY)
    private readonly facebookRepository: IFacebookRepository,
  ) {}

  async execute(userId: string): Promise<FacebookFollowSubmissionDto | null> {
    const row =
      await this.facebookRepository.findLatestFacebookFollowSubmissionByUserId(
        userId,
      );
    return row ? new FacebookFollowSubmissionDto(row) : null;
  }
}
