import { Module } from '@nestjs/common';
import { ClientSuggestionsController } from './client-suggestions.controller.js';
import { AdminSuggestionsController } from './admin-suggestions.controller.js';
import { SubmitSuggestionUseCase } from '../../../application/use-cases/suggestions/submit-suggestion.use-case.js';
import { ListMySuggestionsUseCase } from '../../../application/use-cases/suggestions/list-my-suggestions.use-case.js';
import { ListSuggestionsAdminUseCase } from '../../../application/use-cases/suggestions/list-suggestions-admin.use-case.js';
import { RewardSuggestionUseCase } from '../../../application/use-cases/suggestions/reward-suggestion.use-case.js';
import { DismissSuggestionUseCase } from '../../../application/use-cases/suggestions/dismiss-suggestion.use-case.js';
import { SuggestionRepository } from '../../../infrastructure/repositories/suggestion.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { SUGGESTION_REPOSITORY } from '../../../domain/repositories/suggestion.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';

@Module({
  controllers: [ClientSuggestionsController, AdminSuggestionsController],
  providers: [
    SubmitSuggestionUseCase,
    ListMySuggestionsUseCase,
    ListSuggestionsAdminUseCase,
    RewardSuggestionUseCase,
    DismissSuggestionUseCase,
    {
      provide: SUGGESTION_REPOSITORY,
      useClass: SuggestionRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
})
export class SuggestionsModule {}
