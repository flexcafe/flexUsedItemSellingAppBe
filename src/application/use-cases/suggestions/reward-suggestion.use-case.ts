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
import type { RewardSuggestionDto } from '../../dtos/suggestions/reward-suggestion.dto.js';
import { SuggestionDto } from '../../dtos/suggestions/suggestion.dto.js';

@Injectable()
export class RewardSuggestionUseCase {
  constructor(
    @Inject(SUGGESTION_REPOSITORY)
    private readonly suggestions: ISuggestionRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    suggestionId: string,
    dto: RewardSuggestionDto,
  ): Promise<SuggestionDto> {
    await this.assertAdmin(adminId);

    const row = await this.suggestions.rewardWithPoints({
      suggestionId,
      adminId,
      points: dto.points,
      adminNote: dto.adminNote,
    });

    const noteSuffix = dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : '';
    await this.users.createNotification({
      userId: row.userId,
      eventKey: 'SUGGESTION_REWARDED_CLIENT',
      metadata: {
        suggestionId: row.id,
        pointsAwarded: row.pointsAwarded,
      },
      title: 'Points received for your suggestion',
      message: `Your suggestion was marked useful. You received ${row.pointsAwarded} points.${noteSuffix}`,
      referenceId: row.id,
    });

    await this.users.createNotification({
      userId: adminId,
      eventKey: 'SUGGESTION_REWARDED_ADMIN',
      metadata: {
        suggestionId: row.id,
        targetUserId: row.userId,
        pointsAwarded: row.pointsAwarded,
      },
      title: 'Suggestion reward granted',
      message: `You awarded ${row.pointsAwarded} points for suggestion ${row.id}.`,
      referenceId: row.id,
    });

    return new SuggestionDto(row);
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.users.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
