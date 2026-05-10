import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  FACEBOOK_REPOSITORY,
  type IFacebookRepository,
} from '../../../domain/repositories/facebook.repository.interface.js';
import { FacebookFollowSubmissionStatus } from '../../../domain/enums/facebook-follow-submission-status.enum.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import type { IFileStorage } from '../../../domain/services/file-storage.interface.js';
import { SubmitFacebookFollowDto } from '../../dtos/profile/submit-facebook-follow.dto.js';
import { FacebookFollowSubmissionDto } from '../../dtos/profile/facebook-follow-submission.dto.js';

type UploadInput = {
  originalName: string;
  mimeType: string;
  body: Buffer;
};

@Injectable()
export class SubmitFacebookFollowUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
    @Inject(FACEBOOK_REPOSITORY)
    private readonly facebookRepository: IFacebookRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: SubmitFacebookFollowDto,
    screenshot: UploadInput,
  ): Promise<FacebookFollowSubmissionDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.facebookId) {
      throw new BadRequestException('Link Facebook account first');
    }
    if (!screenshot.body?.length) {
      throw new BadRequestException('Follow screenshot is required');
    }

    const latest =
      await this.facebookRepository.findLatestFacebookFollowSubmissionByUserId(
        userId,
      );
    if (latest?.status === FacebookFollowSubmissionStatus.PENDING) {
      throw new ConflictException(
        'A follow verification request is already pending admin review',
      );
    }

    const screenshotUrl = await this.uploadScreenshot(userId, screenshot);
    const row = await this.facebookRepository.createFacebookFollowSubmission({
      userId,
      facebookName: dto.facebookName,
      facebookProfileUrl: dto.facebookProfileUrl,
      facebookPageUrl: dto.facebookPageUrl,
      screenshotUrl,
    });

    await this.userRepository.createNotification({
      userId,
      eventKey: 'FACEBOOK_FOLLOW_SUBMITTED_CLIENT',
      metadata: {
        submissionId: row.id,
      },
      title: 'Facebook follow submitted',
      message:
        'Your Facebook follow proof was submitted. Admin will review and reward points if valid.',
      referenceId: row.id,
    });

    const adminIds = await this.userRepository.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.userRepository.createNotification({
          userId: adminId,
          eventKey: 'FACEBOOK_FOLLOW_SUBMITTED_ADMIN',
          metadata: {
            submissionId: row.id,
            targetUserId: row.userId,
            nickname: row.userNickname,
            phone: row.userPhone,
            facebookName: row.facebookName,
            facebookProfileUrl: row.facebookProfileUrl,
            facebookPageUrl: row.facebookPageUrl,
            screenshotUrl: row.screenshotUrl,
          },
          title: 'Facebook follow review requested',
          message: `User ${row.userNickname} (${row.userPhone}) submitted Facebook follow proof for manual review.`,
          referenceId: row.id,
        }),
      ),
    );

    return new FacebookFollowSubmissionDto(row);
  }

  private async uploadScreenshot(
    userId: string,
    screenshot: UploadInput,
  ): Promise<string> {
    const bucket = this.configService.get<string>(
      'SUPABASE_FACEBOOK_FOLLOW_BUCKET',
      'facebook-follow-submissions',
    );
    const ext = this.extensionFromMime(screenshot.mimeType);
    const objectPath = `users/${userId}/${randomUUID()}${ext}`;
    const { publicUrl } = await this.fileStorage.uploadPublicFile({
      bucket,
      path: objectPath,
      body: screenshot.body,
      contentType: screenshot.mimeType,
    });
    return publicUrl;
  }

  private extensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      default:
        throw new BadRequestException('Unsupported screenshot image type');
    }
  }
}
