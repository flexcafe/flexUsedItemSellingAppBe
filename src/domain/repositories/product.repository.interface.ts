import { ListingEntity } from '../entities/listing.entity.js';
import { ListingCondition } from '../enums/listing-condition.enum.js';
import { ListingStatus } from '../enums/listing-status.enum.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../enums/delivery-fee-payer.enum.js';

export interface ProductPreferredLocationInput {
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateProductData {
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  status: ListingStatus;
  paymentMethods: PaymentMethod[];
  directTradeLocation?: string | null;
  directTradeLatitude?: number | null;
  directTradeLongitude?: number | null;
  mapScreenshotUrl?: string | null;
  nearbyLandmarks?: string | null;
  preferredTradeTime?: string | null;
  isDeliveryAvailable: boolean;
  deliveryFeePayer?: DeliveryFeePayer | null;
  images: string[];
  preferredLocations: ProductPreferredLocationInput[];
}

export interface UpdateProductData {
  categoryId?: string;
  title?: string;
  description?: string;
  condition?: ListingCondition;
  status?: ListingStatus;
  paymentMethods?: PaymentMethod[];
  directTradeLocation?: string | null;
  directTradeLatitude?: number | null;
  directTradeLongitude?: number | null;
  mapScreenshotUrl?: string | null;
  nearbyLandmarks?: string | null;
  preferredTradeTime?: string | null;
  isDeliveryAvailable?: boolean;
  deliveryFeePayer?: DeliveryFeePayer | null;
  images?: string[];
  preferredLocations?: ProductPreferredLocationInput[];
}

export interface ProductSearchQuery {
  search?: string;
  categoryId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  excludeSellerIds?: string[];
  skip: number;
  take: number;
}

export interface ProductSearchResult {
  rows: ListingEntity[];
  total: number;
}

export interface SellerProductsQuery {
  sellerId: string;
  status?: ListingStatus;
  skip: number;
  take: number;
}

export interface IProductRepository {
  create(data: CreateProductData): Promise<ListingEntity>;
  findById(id: string): Promise<ListingEntity | null>;
  findByIdForSeller(
    listingId: string,
    sellerId: string,
  ): Promise<ListingEntity | null>;
  getActiveDealChatRoomId(listingId: string): Promise<string | null>;
  setActiveDealChatRoomId(
    listingId: string,
    sellerId: string,
    chatRoomId: string | null,
  ): Promise<void>;
  findBySeller(query: SellerProductsQuery): Promise<ProductSearchResult>;
  updateBySeller(
    listingId: string,
    sellerId: string,
    data: UpdateProductData,
  ): Promise<ListingEntity>;
  markAsSold(listingId: string): Promise<void>;
  softDeleteBySeller(listingId: string, sellerId: string): Promise<boolean>;
  search(query: ProductSearchQuery): Promise<ProductSearchResult>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
