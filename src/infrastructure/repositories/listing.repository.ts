import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { ListingMapper } from '../mappers/listing.mapper.js';
import { ListingEntity } from '../../domain/entities/listing.entity.js';
import type {
  IListingRepository,
  CreateListingData,
  UpdateListingData,
  ListingFilter,
} from '../../domain/repositories/listing.repository.interface.js';

const WITH_RELATIONS = {
  seller: true,
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
} as const;

@Injectable()
export class ListingRepository implements IListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateListingData): Promise<ListingEntity> {
    const listing = await this.prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        status: data.status,
        paymentMethods: data.paymentMethods,
        directTradeLocation: data.directTradeLocation,
        directTradeLatitude: data.directTradeLatitude,
        directTradeLongitude: data.directTradeLongitude,
        nearbyLandmarks: data.nearbyLandmarks,
        preferredTradeTime: data.preferredTradeTime,
        mapScreenshotUrl: data.mapScreenshotUrl,
        isDeliveryAvailable: data.isDeliveryAvailable ?? false,
        deliveryFeePayer: data.deliveryFeePayer,
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        images: {
          create: data.imageUrls.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      },
      include: WITH_RELATIONS,
    });
    return ListingMapper.toDomain(listing);
  }

  async findById(id: string): Promise<ListingEntity | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id, isDeleted: false },
      include: WITH_RELATIONS,
    });
    return listing ? ListingMapper.toDomain(listing) : null;
  }

  async findAll(): Promise<ListingEntity[]> {
    const listings = await this.prisma.listing.findMany({
      where: { isDeleted: false },
      include: WITH_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
    return ListingMapper.toDomainList(listings);
  }

  async update(id: string, data: UpdateListingData): Promise<ListingEntity> {
    const { imageUrls, ...scalarFields } = data;

    const listing = await this.prisma.listing.update({
      where: { id, isDeleted: false },
      data: {
        ...scalarFields,
        ...(imageUrls !== undefined && {
          images: {
            deleteMany: {},
            create: imageUrls.map((url, index) => ({
              url,
              sortOrder: index,
            })),
          },
        }),
      },
      include: WITH_RELATIONS,
    });
    return ListingMapper.toDomain(listing);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.listing.update({
      where: { id },
      data: { isDeleted: true },
    });
    return true;
  }

  async findBySellerId(sellerId: string): Promise<ListingEntity[]> {
    const listings = await this.prisma.listing.findMany({
      where: { sellerId, isDeleted: false },
      include: WITH_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
    return ListingMapper.toDomainList(listings);
  }

  async findWithFilters(
    filter: ListingFilter,
  ): Promise<{ listings: ListingEntity[]; total: number }> {
    const {
      categoryId,
      sellerId,
      status,
      condition,
      minPrice,
      maxPrice,
      search,
      skip = 0,
      take = 20,
    } = filter;

    const where: Prisma.ListingWhereInput = {
      isDeleted: false,
      ...(categoryId && { categoryId }),
      ...(sellerId && { sellerId }),
      ...(status && { status }),
      ...(condition && { condition }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: minPrice }),
              ...(maxPrice !== undefined && { lte: maxPrice }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: WITH_RELATIONS,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { listings: ListingMapper.toDomainList(listings), total };
  }
}
