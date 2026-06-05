import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SLIDER_AD_REPOSITORY } from '../../../domain/repositories/slider-ad.repository.interface.js';
import type { ISliderAdRepository } from '../../../domain/repositories/slider-ad.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class DeleteSliderAdUseCase {
  constructor(
    @Inject(SLIDER_AD_REPOSITORY)
    private readonly sliderAds: ISliderAdRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(adminUserId: string, adId: string): Promise<boolean> {
    await requireAdminPermission(
      this.users,
      adminUserId,
      AdminPermission.MANAGE_SLIDER_ADS,
    );

    const existing = await this.sliderAds.findById(adId);
    if (!existing) {
      throw new NotFoundException('Slider ad not found');
    }

    return this.sliderAds.delete(adId);
  }
}
