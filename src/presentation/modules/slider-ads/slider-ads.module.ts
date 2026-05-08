import { Module } from '@nestjs/common';
import { AdminSliderAdsController } from './admin-slider-ads.controller.js';
import { ClientSliderAdsController } from './client-slider-ads.controller.js';
import { UploadPublicFileUseCase } from './upload-public-file.use-case.js';
import { CreateSliderAdUseCase } from '../../../application/use-cases/slider-ads/create-slider-ad.use-case.js';
import { UpdateSliderAdUseCase } from '../../../application/use-cases/slider-ads/update-slider-ad.use-case.js';
import { DeleteSliderAdUseCase } from '../../../application/use-cases/slider-ads/delete-slider-ad.use-case.js';
import { ListSliderAdsUseCase } from '../../../application/use-cases/slider-ads/list-slider-ads.use-case.js';
import { SliderAdRepository } from '../../../infrastructure/repositories/slider-ad.repository.js';
import { SLIDER_AD_REPOSITORY } from '../../../domain/repositories/slider-ad.repository.interface.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import { SupabaseFileStorageService } from '../../../infrastructure/storage/supabase-file-storage.service.js';

@Module({
  controllers: [AdminSliderAdsController, ClientSliderAdsController],
  providers: [
    UploadPublicFileUseCase,
    CreateSliderAdUseCase,
    UpdateSliderAdUseCase,
    DeleteSliderAdUseCase,
    ListSliderAdsUseCase,
    {
      provide: SLIDER_AD_REPOSITORY,
      useClass: SliderAdRepository,
    },
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
export class SliderAdsModule {}
