import { Injectable } from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import type { SliderAdStatus as PrismaSliderAdStatusType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { SliderAdEntity } from '../../domain/entities/slider-ad.entity.js';
import {
  type CreateSliderAdData,
  type ISliderAdRepository,
  type UpdateSliderAdData,
} from '../../domain/repositories/slider-ad.repository.interface.js';
import { SliderAdStatus } from '../../domain/enums/slider-ad-status.enum.js';

const { SliderAdStatus: PrismaSliderAdStatus } = PrismaPkg;

@Injectable()
export class SliderAdRepository implements ISliderAdRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSliderAdData): Promise<SliderAdEntity> {
    const row = await this.prisma.sliderAd.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl ?? null,
        status: (data.status ??
          SliderAdStatus.ACTIVE) as unknown as PrismaSliderAdStatusType,
        sortOrder: data.sortOrder ?? 0,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        createdById: data.createdById,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<SliderAdEntity | null> {
    const row = await this.prisma.sliderAd.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async update(id: string, data: UpdateSliderAdData): Promise<SliderAdEntity> {
    const row = await this.prisma.sliderAd.update({
      where: { id },
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        status: data.status
          ? (data.status as unknown as PrismaSliderAdStatusType)
          : undefined,
        sortOrder: data.sortOrder,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.sliderAd.delete({ where: { id } });
    return true;
  }

  async listAll(): Promise<SliderAdEntity[]> {
    const rows = await this.prisma.sliderAd.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listActive(now: Date): Promise<SliderAdEntity[]> {
    const rows = await this.prisma.sliderAd.findMany({
      where: {
        status: PrismaSliderAdStatus.ACTIVE,
        OR: [
          { startsAt: null, endsAt: null },
          {
            AND: [
              { startsAt: { lte: now } },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string | null;
    status: PrismaSliderAdStatusType;
    sortOrder: number;
    startsAt: Date | null;
    endsAt: Date | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }): SliderAdEntity {
    return new SliderAdEntity({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl,
      linkUrl: row.linkUrl,
      status: row.status as unknown as SliderAdStatus,
      sortOrder: row.sortOrder,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
