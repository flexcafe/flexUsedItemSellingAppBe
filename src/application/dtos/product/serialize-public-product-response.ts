import type { PaginatedResponseDto } from '../common/pagination.dto.js';
import type { ProductResponseDto } from './product-response.dto.js';

/** Plain JSON object for public catalog/detail (always includes `createdAtDisplay`). */
export type PublicProductResponseJson = Omit<
  ProductResponseDto,
  'createdAtDisplay'
> & {
  createdAtDisplay: string;
};

export function serializePublicProduct(
  dto: ProductResponseDto,
): PublicProductResponseJson {
  if (!dto.createdAtDisplay) {
    throw new Error(
      'serializePublicProduct: createdAtDisplay must be set before serializing',
    );
  }
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    price: dto.price,
    condition: dto.condition,
    status: dto.status,
    paymentMethods: dto.paymentMethods,
    directTradeLocation: dto.directTradeLocation,
    directTradeLatitude: dto.directTradeLatitude,
    directTradeLongitude: dto.directTradeLongitude,
    mapScreenshotUrl: dto.mapScreenshotUrl,
    nearbyLandmarks: dto.nearbyLandmarks,
    preferredTradeTime: dto.preferredTradeTime,
    isDeliveryAvailable: dto.isDeliveryAvailable,
    deliveryFeePayer: dto.deliveryFeePayer,
    images: dto.images,
    sellerId: dto.sellerId,
    categoryId: dto.categoryId,
    viewCount: dto.viewCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    createdAtDisplay: dto.createdAtDisplay,
  };
}

export function serializePublicProductPage(
  page: PaginatedResponseDto<ProductResponseDto>,
) {
  return {
    items: page.items.map(serializePublicProduct),
    total: page.total,
    page: page.page,
    limit: page.limit,
    totalPages: page.totalPages,
    hasNextPage: page.hasNextPage,
    hasPrevPage: page.hasPrevPage,
  };
}
