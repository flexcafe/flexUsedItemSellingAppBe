import { Inject, Injectable } from '@nestjs/common';
import {
  MODERATION_SUPPORT_REPOSITORY,
  type IModerationSupportRepository,
} from '../../../domain/repositories/moderation-support.repository.interface.js';
import {
  CURRENT_TERMS_VERSION,
  DEFAULT_TERMS_CONTENT,
  DEFAULT_TERMS_TITLE,
} from '../../../domain/constants/terms-of-service.constant.js';
import { TermsAcceptanceStatusDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class GetTermsAcceptanceStatusUseCase {
  constructor(
    @Inject(MODERATION_SUPPORT_REPOSITORY)
    private readonly moderation: IModerationSupportRepository,
  ) {}

  async execute(userId: string): Promise<TermsAcceptanceStatusDto> {
    const terms = await this.moderation.ensureActiveTermsSeeded({
      version: CURRENT_TERMS_VERSION,
      title: DEFAULT_TERMS_TITLE,
      content: DEFAULT_TERMS_CONTENT,
    });
    const state = await this.moderation.getUserTermsState(userId);
    const needsAcceptance = state.termsVersion !== terms.version;
    return {
      currentVersion: terms.version,
      acceptedVersion: state.termsVersion,
      acceptedAt: state.termsAcceptedAt,
      needsAcceptance,
    };
  }
}
