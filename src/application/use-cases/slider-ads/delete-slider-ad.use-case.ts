import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SLIDER_AD_REPOSITORY } from '../../../domain/repositories/slider-ad.repository.interface.js';
import type { ISliderAdRepository } from '../../../domain/repositories/slider-ad.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class DeleteSliderAdUseCase {
  constructor(
    @Inject(SLIDER_AD_REPOSITORY)
    private readonly sliderAds: ISliderAdRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(adminUserId: string, adId: string): Promise<boolean> {
    const admin = await this.users.findById(adminUserId);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }
    if (!admin.isAdmin()) {
      throw new ForbiddenException('Only admins can manage slider ads');
    }

    const existing = await this.sliderAds.findById(adId);
    if (!existing) {
      throw new NotFoundException('Slider ad not found');
    }

    return this.sliderAds.delete(adId);
  }
}
