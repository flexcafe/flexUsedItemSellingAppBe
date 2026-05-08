import { Inject, Injectable } from '@nestjs/common';
import { SLIDER_AD_REPOSITORY } from '../../../domain/repositories/slider-ad.repository.interface.js';
import type { ISliderAdRepository } from '../../../domain/repositories/slider-ad.repository.interface.js';

@Injectable()
export class ListSliderAdsUseCase {
  constructor(
    @Inject(SLIDER_AD_REPOSITORY)
    private readonly sliderAds: ISliderAdRepository,
  ) {}

  async listAll() {
    return this.sliderAds.listAll();
  }

  async listActive() {
    return this.sliderAds.listActive(new Date());
  }
}
