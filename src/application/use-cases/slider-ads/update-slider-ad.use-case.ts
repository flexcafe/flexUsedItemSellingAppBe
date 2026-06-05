import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SLIDER_AD_REPOSITORY } from '../../../domain/repositories/slider-ad.repository.interface.js';
import type { ISliderAdRepository } from '../../../domain/repositories/slider-ad.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { UpdateSliderAdDto } from '../../dtos/slider-ads/update-slider-ad.dto.js';
import { SliderAdEntity } from '../../../domain/entities/slider-ad.entity.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class UpdateSliderAdUseCase {
  constructor(
    @Inject(SLIDER_AD_REPOSITORY)
    private readonly sliderAds: ISliderAdRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminUserId: string,
    adId: string,
    dto: UpdateSliderAdDto,
    imageUrl?: string,
  ): Promise<SliderAdEntity> {
    await requireAdminPermission(
      this.users,
      adminUserId,
      AdminPermission.MANAGE_SLIDER_ADS,
    );

    const existing = await this.sliderAds.findById(adId);
    if (!existing) {
      throw new NotFoundException('Slider ad not found');
    }

    return this.sliderAds.update(adId, {
      title: dto.title,
      linkUrl: dto.linkUrl,
      status: dto.status,
      sortOrder: dto.sortOrder,
      startsAt: dto.startsAt
        ? new Date(dto.startsAt)
        : dto.startsAt === null
          ? null
          : undefined,
      endsAt: dto.endsAt
        ? new Date(dto.endsAt)
        : dto.endsAt === null
          ? null
          : undefined,
      imageUrl,
    });
  }
}
