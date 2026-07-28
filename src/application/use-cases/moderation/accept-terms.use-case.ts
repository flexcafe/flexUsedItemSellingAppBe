import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MODERATION_SUPPORT_REPOSITORY,
  type IModerationSupportRepository,
} from '../../../domain/repositories/moderation-support.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  CURRENT_TERMS_VERSION,
  DEFAULT_TERMS_CONTENT,
  DEFAULT_TERMS_TITLE,
} from '../../../domain/constants/terms-of-service.constant.js';
import type { AcceptTermsDto } from '../../dtos/moderation/moderation.dto.js';
import { TermsAcceptanceStatusDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class AcceptTermsUseCase {
  constructor(
    @Inject(MODERATION_SUPPORT_REPOSITORY)
    private readonly moderation: IModerationSupportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: AcceptTermsDto,
  ): Promise<TermsAcceptanceStatusDto> {
    const existingUser = await this.users.findById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const terms = await this.moderation.ensureActiveTermsSeeded({
      version: CURRENT_TERMS_VERSION,
      title: DEFAULT_TERMS_TITLE,
      content: DEFAULT_TERMS_CONTENT,
    });
    if (dto.termsVersion.trim() !== terms.version) {
      throw new BadRequestException(
        `Please accept the current Terms of Use (version ${terms.version})`,
      );
    }
    await this.moderation.acceptTerms(userId, terms.version);
    return {
      currentVersion: terms.version,
      acceptedVersion: terms.version,
      acceptedAt: new Date(),
      needsAcceptance: false,
    };
  }
}
