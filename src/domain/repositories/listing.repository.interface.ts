import { ListingEntity } from '../entities/listing.entity.js';
import { ListingStatus } from '../enums/listing-status.enum.js';
import { ListingCondition } from '../enums/listing-condition.enum.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../enums/delivery-fee-payer.enum.js';

export interface CreateListingData {
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  status: ListingStatus;
  paymentMethods: PaymentMethod[];
  directTradeLocation?: string;
  directTradeLatitude?: number;
  directTradeLongitude?: number;
  nearbyLandmarks?: string;
  preferredTradeTime?: string;
  mapScreenshotUrl?: string;
  isDeliveryAvailable?: boolean;
  deliveryFeePayer?: DeliveryFeePayer;
  imageUrls: string[];
  sellerId: string;
  categoryId: string;
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  price?: number;
  condition?: ListingCondition;
  status?: ListingStatus;
  paymentMethods?: PaymentMethod[];
  directTradeLocation?: string | null;
  directTradeLatitude?: number | null;
  directTradeLongitude?: number | null;
  nearbyLandmarks?: string | null;
  preferredTradeTime?: string | null;
  isDeliveryAvailable?: boolean;
  deliveryFeePayer?: DeliveryFeePayer | null;
  imageUrls?: string[];
}

export interface ListingFilter {
  categoryId?: string;
  sellerId?: string;
  status?: ListingStatus;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  skip?: number;
  take?: number;
}

export interface IListingRepository {
  create(data: CreateListingData): Promise<ListingEntity>;
  findById(id: string): Promise<ListingEntity | null>;
  findAll(): Promise<ListingEntity[]>;
  update(id: string, data: UpdateListingData): Promise<ListingEntity>;
  delete(id: string): Promise<boolean>;
  findWithFilters(
    filter: ListingFilter,
  ): Promise<{ listings: ListingEntity[]; total: number }>;
  findBySellerId(sellerId: string): Promise<ListingEntity[]>;
}

export const LISTING_REPOSITORY = Symbol('LISTING_REPOSITORY');
