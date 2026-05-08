import { SliderAdEntity } from '../entities/slider-ad.entity.js';
import { SliderAdStatus } from '../enums/slider-ad-status.enum.js';

export type CreateSliderAdData = {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  status?: SliderAdStatus;
  sortOrder?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdById: string;
};

export type UpdateSliderAdData = {
  title?: string;
  imageUrl?: string;
  linkUrl?: string | null;
  status?: SliderAdStatus;
  sortOrder?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export interface ISliderAdRepository {
  create(data: CreateSliderAdData): Promise<SliderAdEntity>;
  findById(id: string): Promise<SliderAdEntity | null>;
  update(id: string, data: UpdateSliderAdData): Promise<SliderAdEntity>;
  delete(id: string): Promise<boolean>;

  listAll(): Promise<SliderAdEntity[]>;
  listActive(now: Date): Promise<SliderAdEntity[]>;
}

export const SLIDER_AD_REPOSITORY = Symbol('SLIDER_AD_REPOSITORY');
