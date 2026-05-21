import { Inject, Injectable } from '@nestjs/common';
import {
  SUGGESTION_REPOSITORY,
  type ISuggestionRepository,
} from '../../../domain/repositories/suggestion.repository.interface.js';
import { SuggestionDto } from '../../dtos/suggestions/suggestion.dto.js';

@Injectable()
export class ListMySuggestionsUseCase {
  constructor(
    @Inject(SUGGESTION_REPOSITORY)
    private readonly suggestions: ISuggestionRepository,
  ) {}

  async execute(userId: string): Promise<SuggestionDto[]> {
    const rows = await this.suggestions.listByUserId(userId);
    return rows.map((row) => new SuggestionDto(row));
  }
}
