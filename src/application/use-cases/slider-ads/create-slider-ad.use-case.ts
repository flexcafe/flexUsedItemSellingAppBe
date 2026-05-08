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
import { CreateSliderAdDto } from '../../dtos/slider-ads/create-slider-ad.dto.js';
import { SliderAdEntity } from '../../../domain/entities/slider-ad.entity.js';

@Injectable()
export class CreateSliderAdUseCase {
  constructor(
    @Inject(SLIDER_AD_REPOSITORY)
    private readonly sliderAds: ISliderAdRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminUserId: string,
    dto: CreateSliderAdDto,
    imageUrl: string,
  ): Promise<SliderAdEntity> {
    const admin = await this.users.findById(adminUserId);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }
    if (!admin.isAdmin()) {
      throw new ForbiddenException('Only admins can manage slider ads');
    }

    return this.sliderAds.create({
      title: dto.title,
      imageUrl,
      linkUrl: dto.linkUrl ?? null,
      status: dto.status,
      sortOrder: dto.sortOrder,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      createdById: adminUserId,
    });
  }
}
