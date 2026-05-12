import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import {
  type CreateProductData,
  type IProductRepository,
  type ProductSearchQuery,
  type ProductSearchResult,
  type SellerProductsQuery,
  type UpdateProductData,
} from '../../domain/repositories/product.repository.interface.js';
import { ListingMapper } from '../mappers/listing.mapper.js';

const { ListingStatus: PrismaListingStatus, Prisma: PrismaNs } = PrismaPkg;

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    category: true;
    seller: true;
    images: true;
  };
}>;

type ListingIdRow = { id: string };

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductData) {
    const listing = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          sellerId: data.sellerId,
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          price: data.price,
          condition: data.condition,
          status: data.status,
          paymentMethods: data.paymentMethods,
          directTradeLocation: data.directTradeLocation ?? null,
          directTradeLatitude: data.directTradeLatitude ?? null,
          directTradeLongitude: data.directTradeLongitude ?? null,
          mapScreenshotUrl: data.mapScreenshotUrl ?? null,
          nearbyLandmarks: data.nearbyLandmarks ?? null,
          preferredTradeTime: data.preferredTradeTime ?? null,
          isDeliveryAvailable: data.isDeliveryAvailable,
          deliveryFeePayer: data.deliveryFeePayer ?? null,
        },
      });

      if (data.images.length > 0) {
        await tx.listingImage.createMany({
          data: data.images.map((url, i) => ({
            listingId: created.id,
            url,
            sortOrder: i,
          })),
        });
      }

      if (data.preferredLocations.length > 0) {
        await tx.preferredTradeLocation.createMany({
          data: data.preferredLocations.map((loc, i) => ({
            listingId: created.id,
            label: loc.label,
            address: loc.address,
            latitude: loc.latitude ?? null,
            longitude: loc.longitude ?? null,
            sortOrder: i,
          })),
        });
      }

      return created;
    });

    const row = await this.findListingWithRelations(listing.id);
    return ListingMapper.toDomain(row);
  }

  async findById(id: string) {
    const row = await this.prisma.listing.findUnique({
      where: { id },
      include: { category: true, seller: true, images: true },
    });
    if (!row || row.isDeleted) {
      return null;
    }
    return ListingMapper.toDomain(row);
  }

  async findBySeller({ sellerId, skip, take }: SellerProductsQuery) {
    const safeTake = Math.max(1, Math.min(take, 50));
    const safeSkip = Math.max(0, skip);
    const total = await this.prisma.listing.count({
      where: { sellerId, isDeleted: false },
    });
    const rows = await this.prisma.listing.findMany({
      where: { sellerId, isDeleted: false },
      include: { category: true, seller: true, images: true },
      orderBy: { createdAt: 'desc' },
      skip: safeSkip,
      take: safeTake,
    });
    return {
      rows: rows.map((r) => ListingMapper.toDomain(r)),
      total,
    };
  }

  async updateBySeller(
    listingId: string,
    sellerId: string,
    data: UpdateProductData,
  ) {
    const existing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    if (existing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only modify your own products');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.updateMany({
        where: {
          id: listingId,
          sellerId,
          isDeleted: false,
        },
        data: {
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          condition: data.condition,
          status: data.status,
          paymentMethods: data.paymentMethods,
          directTradeLocation: data.directTradeLocation,
          directTradeLatitude: data.directTradeLatitude,
          directTradeLongitude: data.directTradeLongitude,
          mapScreenshotUrl: data.mapScreenshotUrl,
          nearbyLandmarks: data.nearbyLandmarks,
          preferredTradeTime: data.preferredTradeTime,
          isDeliveryAvailable: data.isDeliveryAvailable,
          deliveryFeePayer: data.deliveryFeePayer,
        },
      });
      if (updated.count === 0) {
        throw new NotFoundException('Product not found');
      }

      if (data.images) {
        await tx.listingImage.deleteMany({ where: { listingId } });
        if (data.images.length > 0) {
          await tx.listingImage.createMany({
            data: data.images.map((url, i) => ({
              listingId,
              url,
              sortOrder: i,
            })),
          });
        }
      }

      if (data.preferredLocations) {
        await tx.preferredTradeLocation.deleteMany({ where: { listingId } });
        if (data.preferredLocations.length > 0) {
          await tx.preferredTradeLocation.createMany({
            data: data.preferredLocations.map((loc, i) => ({
              listingId,
              label: loc.label,
              address: loc.address,
              latitude: loc.latitude ?? null,
              longitude: loc.longitude ?? null,
              sortOrder: i,
            })),
          });
        }
      }
    });

    const row = await this.findListingWithRelations(listingId);
    return ListingMapper.toDomain(row);
  }

  async softDeleteBySeller(listingId: string, sellerId: string) {
    const existing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    if (existing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    const result = await this.prisma.listing.updateMany({
      where: {
        id: listingId,
        sellerId,
        isDeleted: false,
      },
      data: { isDeleted: true, status: PrismaListingStatus.ARCHIVED },
    });
    if (result.count === 0) {
      throw new NotFoundException('Product not found');
    }
    return true;
  }

  async search(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const where = this.buildSearchWhereSql(query);
    const hasGeo = query.latitude != null && query.longitude != null;
    const take = Math.max(1, Math.min(query.take, 50));
    const skip = Math.max(0, query.skip);

    const countRows = await this.prisma.$queryRaw<{ total: number }[]>(
      PrismaNs.sql`
        SELECT COUNT(*)::int AS total
        FROM listings l
        WHERE ${where}
      `,
    );
    const total = countRows[0]?.total ?? 0;
    if (total === 0) {
      return { rows: [], total: 0 };
    }

    const ids = hasGeo
      ? await this.prisma.$queryRaw<ListingIdRow[]>(
          PrismaNs.sql`
            SELECT l.id
            FROM listings l
            WHERE ${where}
            ORDER BY
              (l.geo_location IS NULL) ASC,
              ST_Distance(
                l.geo_location,
                ST_SetSRID(
                  ST_MakePoint(${query.longitude!}, ${query.latitude!}),
                  4326
                )::geography
              ) ASC NULLS LAST,
              l.created_at DESC
            LIMIT ${take}
            OFFSET ${skip}
          `,
        )
      : await this.prisma.$queryRaw<ListingIdRow[]>(
          PrismaNs.sql`
            SELECT l.id
            FROM listings l
            WHERE ${where}
            ORDER BY l.created_at DESC
            LIMIT ${take}
            OFFSET ${skip}
          `,
        );

    if (ids.length === 0) {
      return { rows: [], total };
    }

    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      include: { category: true, seller: true, images: true },
    });
    const byId = new Map(rows.map((r) => [r.id, ListingMapper.toDomain(r)]));
    const ordered = ids
      .map((r) => byId.get(r.id))
      .filter((r): r is NonNullable<typeof r> => !!r);
    return { rows: ordered, total };
  }

  private buildSearchWhereSql(query: ProductSearchQuery): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      PrismaNs.sql`l.is_deleted = false`,
      PrismaNs.sql`l.status = 'ACTIVE'::"ListingStatus"`,
    ];

    if (query.categoryId) {
      conditions.push(PrismaNs.sql`l.category_id = ${query.categoryId}`);
    }
    if (query.search?.trim()) {
      const q = `%${query.search.trim()}%`;
      conditions.push(
        PrismaNs.sql`(l.title ILIKE ${q} OR l.description ILIKE ${q})`,
      );
    }

    const hasGeo = query.latitude != null && query.longitude != null;
    if (hasGeo && query.radiusKm && query.radiusKm > 0) {
      const meters = query.radiusKm * 1000;
      conditions.push(
        PrismaNs.sql`ST_DWithin(
          l.geo_location,
          ST_SetSRID(
            ST_MakePoint(${query.longitude!}, ${query.latitude!}),
            4326
          )::geography,
          ${meters}
        )`,
      );
    }
    return PrismaNs.sql`${PrismaNs.join(conditions, ' AND ')}`;
  }

  private async findListingWithRelations(
    id: string,
  ): Promise<ListingWithRelations> {
    const row = await this.prisma.listing.findUnique({
      where: { id },
      include: { category: true, seller: true, images: true },
    });
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return row;
  }
}
