import { Module } from '@nestjs/common';
import { ClientProfileController } from './client-profile.controller.js';
import { ChangePasswordUseCase } from '../../../application/use-cases/profile/change-password.use-case.js';
import { UploadAvatarUseCase } from '../../../application/use-cases/profile/upload-avatar.use-case.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import { SupabaseFileStorageService } from '../../../infrastructure/storage/supabase-file-storage.service.js';

@Module({
  controllers: [ClientProfileController],
  providers: [
    ChangePasswordUseCase,
    UploadAvatarUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: FILE_STORAGE,
      useClass: SupabaseFileStorageService,
    },
  ],
})
export class ProfileModule {}
