import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  SUGGESTION_REPOSITORY,
  type ISuggestionRepository,
} from '../../../domain/repositories/suggestion.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { SuggestionStatus } from '../../../domain/enums/suggestion-status.enum.js';
import { SuggestionDto } from '../../dtos/suggestions/suggestion.dto.js';

@Injectable()
export class ListSuggestionsAdminUseCase {
  constructor(
    @Inject(SUGGESTION_REPOSITORY)
    private readonly suggestions: ISuggestionRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    status?: SuggestionStatus,
  ): Promise<SuggestionDto[]> {
    await this.assertAdmin(adminId);
    const rows = await this.suggestions.listForAdmin(status);
    return rows.map((row) => new SuggestionDto(row));
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.users.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
