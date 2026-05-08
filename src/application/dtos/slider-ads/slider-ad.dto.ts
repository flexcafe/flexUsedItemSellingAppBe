import { ApiProperty } from '@nestjs/swagger';
import { SliderAdStatus } from '../../../domain/enums/slider-ad-status.enum.js';
import type { SliderAdEntity } from '../../../domain/entities/slider-ad.entity.js';

export class SliderAdDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty({ nullable: true })
  linkUrl: string | null;

  @ApiProperty({ enum: SliderAdStatus })
  status: SliderAdStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ nullable: true })
  startsAt: Date | null;

  @ApiProperty({ nullable: true })
  endsAt: Date | null;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(entity: SliderAdEntity) {
    this.id = entity.id;
    this.title = entity.title;
    this.imageUrl = entity.imageUrl;
    this.linkUrl = entity.linkUrl;
    this.status = entity.status;
    this.sortOrder = entity.sortOrder;
    this.startsAt = entity.startsAt;
    this.endsAt = entity.endsAt;
    this.createdById = entity.createdById;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
