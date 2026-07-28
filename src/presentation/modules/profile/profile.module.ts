import { Module } from '@nestjs/common';
import { ClientProfileController } from './client-profile.controller.js';
import { AdminFacebookFollowController } from './admin-facebook-follow.controller.js';
import { ChangePasswordUseCase } from '../../../application/use-cases/profile/change-password.use-case.js';
import { DeleteAccountUseCase } from '../../../application/use-cases/profile/delete-account.use-case.js';
import { UploadAvatarUseCase } from '../../../application/use-cases/profile/upload-avatar.use-case.js';
import { LinkFacebookUseCase } from '../../../application/use-cases/profile/link-facebook.use-case.js';
import { SubmitFacebookFollowUseCase } from '../../../application/use-cases/profile/submit-facebook-follow.use-case.js';
import { GetMyFacebookFollowSubmissionUseCase } from '../../../application/use-cases/profile/get-my-facebook-follow-submission.use-case.js';
import { ListFacebookFollowSubmissionsUseCase } from '../../../application/use-cases/profile/list-facebook-follow-submissions.use-case.js';
import { ReviewFacebookFollowSubmissionUseCase } from '../../../application/use-cases/profile/review-facebook-follow-submission.use-case.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { FacebookRepository } from '../../../infrastructure/repositories/facebook.repository.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { FACEBOOK_REPOSITORY } from '../../../domain/repositories/facebook.repository.interface.js';
import { FACEBOOK_AUTH_SERVICE } from '../../../domain/services/facebook-auth.interface.js';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import { FacebookGraphAuthService } from '../../../infrastructure/facebook/facebook-graph-auth.service.js';
import { SupabaseFileStorageService } from '../../../infrastructure/storage/supabase-file-storage.service.js';

@Module({
  controllers: [ClientProfileController, AdminFacebookFollowController],
  providers: [
    ChangePasswordUseCase,
    DeleteAccountUseCase,
    UploadAvatarUseCase,
    LinkFacebookUseCase,
    SubmitFacebookFollowUseCase,
    GetMyFacebookFollowSubmissionUseCase,
    ListFacebookFollowSubmissionsUseCase,
    ReviewFacebookFollowSubmissionUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: FACEBOOK_REPOSITORY,
      useClass: FacebookRepository,
    },
    {
      provide: FILE_STORAGE,
      useClass: SupabaseFileStorageService,
    },
    {
      provide: FACEBOOK_AUTH_SERVICE,
      useClass: FacebookGraphAuthService,
    },
  ],
})
export class ProfileModule {}
