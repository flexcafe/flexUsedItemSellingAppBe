import { Module } from '@nestjs/common';
import { ClientLegalController } from './client-legal.controller.js';
import { ClientModerationController } from './client-moderation.controller.js';
import { AdminModerationController } from './admin-moderation.controller.js';
import { ContentReportRepository } from '../../../infrastructure/repositories/content-report.repository.js';
import { UserBlockRepository } from '../../../infrastructure/repositories/user-block.repository.js';
import { ModerationSupportRepository } from '../../../infrastructure/repositories/moderation-support.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { CONTENT_REPORT_REPOSITORY } from '../../../domain/repositories/content-report.repository.interface.js';
import { USER_BLOCK_REPOSITORY } from '../../../domain/repositories/user-block.repository.interface.js';
import { MODERATION_SUPPORT_REPOSITORY } from '../../../domain/repositories/moderation-support.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { ContentFilterService } from '../../../application/services/content-filter.service.js';
import {
  AcceptTermsUseCase,
  ActionContentReportUseCase,
  AddContentFilterKeywordUseCase,
  BlockUserUseCase,
  DeactivateContentFilterKeywordUseCase,
  DismissContentReportUseCase,
  GetActiveTermsUseCase,
  GetTermsAcceptanceStatusUseCase,
  ListBlockedUserIdsUseCase,
  ListBlockedUsersUseCase,
  ListContentFilterKeywordsUseCase,
  ListContentReportsAdminUseCase,
  ListMyContentReportsUseCase,
  SubmitContentReportUseCase,
  UnblockUserUseCase,
} from '../../../application/use-cases/moderation/index.js';

@Module({
  controllers: [
    ClientLegalController,
    ClientModerationController,
    AdminModerationController,
  ],
  providers: [
    GetActiveTermsUseCase,
    AcceptTermsUseCase,
    GetTermsAcceptanceStatusUseCase,
    SubmitContentReportUseCase,
    ListMyContentReportsUseCase,
    ListContentReportsAdminUseCase,
    ActionContentReportUseCase,
    DismissContentReportUseCase,
    BlockUserUseCase,
    UnblockUserUseCase,
    ListBlockedUsersUseCase,
    ListBlockedUserIdsUseCase,
    ListContentFilterKeywordsUseCase,
    AddContentFilterKeywordUseCase,
    DeactivateContentFilterKeywordUseCase,
    ContentFilterService,
    {
      provide: CONTENT_REPORT_REPOSITORY,
      useClass: ContentReportRepository,
    },
    {
      provide: USER_BLOCK_REPOSITORY,
      useClass: UserBlockRepository,
    },
    {
      provide: MODERATION_SUPPORT_REPOSITORY,
      useClass: ModerationSupportRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [
    ContentFilterService,
    USER_BLOCK_REPOSITORY,
    MODERATION_SUPPORT_REPOSITORY,
  ],
})
export class ModerationModule {}
