import { Inject, Injectable } from '@nestjs/common';
import {
  SUGGESTION_REPOSITORY,
  type ISuggestionRepository,
} from '../../../domain/repositories/suggestion.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import type { DismissSuggestionDto } from '../../dtos/suggestions/dismiss-suggestion.dto.js';
import { SuggestionDto } from '../../dtos/suggestions/suggestion.dto.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class DismissSuggestionUseCase {
  constructor(
    @Inject(SUGGESTION_REPOSITORY)
    private readonly suggestions: ISuggestionRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    suggestionId: string,
    dto: DismissSuggestionDto,
  ): Promise<SuggestionDto> {
    await requireAdminPermission(
      this.users,
      adminId,
      AdminPermission.MANAGE_SUGGESTIONS,
    );

    const row = await this.suggestions.dismiss({
      suggestionId,
      adminId,
      adminNote: dto.adminNote,
    });

    const noteSuffix = dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : '';
    await this.users.createNotification({
      userId: row.userId,
      eventKey: 'SUGGESTION_DISMISSED_CLIENT',
      metadata: {
        suggestionId: row.id,
        adminNote: dto.adminNote ?? null,
      },
      title: 'Suggestion reviewed',
      message:
        `Your suggestion was reviewed. No points were awarded this time.${noteSuffix}`.trim(),
      referenceId: row.id,
    });

    return new SuggestionDto(row);
  }
}
