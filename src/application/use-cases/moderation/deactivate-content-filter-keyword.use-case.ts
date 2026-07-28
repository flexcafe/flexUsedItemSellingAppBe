import { Inject, Injectable } from '@nestjs/common';
import {
  MODERATION_SUPPORT_REPOSITORY,
  type IModerationSupportRepository,
} from '../../../domain/repositories/moderation-support.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';
import { ContentFilterService } from '../../services/content-filter.service.js';

@Injectable()
export class DeactivateContentFilterKeywordUseCase {
  constructor(
    @Inject(MODERATION_SUPPORT_REPOSITORY)
    private readonly moderation: IModerationSupportRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly contentFilter: ContentFilterService,
  ) {}

  async execute(adminId: string, keywordId: string) {
    await requireAdminPermission(
      this.users,
      adminId,
      AdminPermission.MANAGE_REPORTS,
    );
    const ok = await this.moderation.deactivateFilterKeyword(keywordId);
    this.contentFilter.invalidate();
    return { keywordId, deactivated: ok };
  }
}
