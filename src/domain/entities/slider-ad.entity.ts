import { SliderAdStatus } from '../enums/slider-ad-status.enum.js';

export interface SliderAdEntityProps {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  status: SliderAdStatus;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SliderAdEntity {
  readonly id: string;
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string | null;
  readonly status: SliderAdStatus;
  readonly sortOrder: number;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
  readonly createdById: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SliderAdEntityProps) {
    this.id = props.id;
    this.title = props.title;
    this.imageUrl = props.imageUrl;
    this.linkUrl = props.linkUrl;
    this.status = props.status;
    this.sortOrder = props.sortOrder;
    this.startsAt = props.startsAt;
    this.endsAt = props.endsAt;
    this.createdById = props.createdById;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
