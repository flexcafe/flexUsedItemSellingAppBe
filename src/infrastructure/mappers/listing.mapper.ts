import type {
  Listing as PrismaListing,
  ListingImage as PrismaListingImage,
  User as PrismaUser,
  Category as PrismaCategory,
} from '@prisma/client';
import { ListingEntity } from '../../domain/entities/listing.entity.js';
import { ListingStatus } from '../../domain/enums/listing-status.enum.js';
import { ListingCondition } from '../../domain/enums/listing-condition.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../domain/enums/delivery-fee-payer.enum.js';
import { UserMapper } from './user.mapper.js';
import { CategoryMapper } from './category.mapper.js';

type PrismaListingWithRelations = PrismaListing & {
  seller?: PrismaUser;
  category?: PrismaCategory;
  images?: PrismaListingImage[];
};

export class ListingMapper {
  static toDomain(prisma: PrismaListingWithRelations): ListingEntity {
    return new ListingEntity({
      id: prisma.id,
      title: prisma.title,
      description: prisma.description,
      price: Number(prisma.price),
      condition: prisma.condition as ListingCondition,
      status: prisma.status as ListingStatus,
      paymentMethods: prisma.paymentMethods.map((m) => m as PaymentMethod),
      directTradeLocation: prisma.directTradeLocation,
      directTradeLatitude: prisma.directTradeLatitude,
      directTradeLongitude: prisma.directTradeLongitude,
      mapScreenshotUrl: prisma.mapScreenshotUrl,
      nearbyLandmarks: prisma.nearbyLandmarks,
      preferredTradeTime: prisma.preferredTradeTime,
      isDeliveryAvailable: prisma.isDeliveryAvailable,
      deliveryFeePayer: prisma.deliveryFeePayer as DeliveryFeePayer | null,
      images: prisma.images
        ? prisma.images
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((img) => img.url)
        : [],
      isDeleted: prisma.isDeleted,
      viewCount: prisma.viewCount,
      sellerId: prisma.sellerId,
      categoryId: prisma.categoryId,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      seller: prisma.seller ? UserMapper.toDomain(prisma.seller) : undefined,
      category: prisma.category
        ? CategoryMapper.toDomain(prisma.category)
        : undefined,
    });
  }

  static toDomainList(
    prismaList: PrismaListingWithRelations[],
  ): ListingEntity[] {
    return prismaList.map((p) => ListingMapper.toDomain(p));
  }
}
