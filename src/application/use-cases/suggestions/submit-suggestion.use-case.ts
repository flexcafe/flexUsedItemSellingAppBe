import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SUGGESTION_REPOSITORY,
  type ISuggestionRepository,
} from '../../../domain/repositories/suggestion.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import type { SubmitSuggestionDto } from '../../dtos/suggestions/submit-suggestion.dto.js';
import { SuggestionDto } from '../../dtos/suggestions/suggestion.dto.js';

@Injectable()
export class SubmitSuggestionUseCase {
  constructor(
    @Inject(SUGGESTION_REPOSITORY)
    private readonly suggestions: ISuggestionRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: SubmitSuggestionDto,
  ): Promise<SuggestionDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const row = await this.suggestions.create({
      userId,
      nickname: dto.nickname.trim(),
      name: dto.name.trim(),
      details: dto.details.trim(),
    });

    await this.users.createNotification({
      userId,
      eventKey: 'SUGGESTION_SUBMITTED_CLIENT',
      metadata: { suggestionId: row.id },
      title: 'Suggestion submitted',
      message:
        'Thank you. Your suggestion was sent to the admin team for review.',
      referenceId: row.id,
    });

    const adminIds = await this.users.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'SUGGESTION_SUBMITTED_ADMIN',
          metadata: {
            suggestionId: row.id,
            submitterUserId: row.userId,
            nickname: row.nickname,
            name: row.name,
            accountNickname: row.userNickname,
            phone: row.userPhone,
          },
          title: 'New user suggestion',
          message: `${row.name} (${row.nickname}) submitted a suggestion for review.`,
          referenceId: row.id,
        }),
      ),
    );

    return new SuggestionDto(row);
  }
}
