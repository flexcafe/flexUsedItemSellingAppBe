import { NotFoundException } from '@nestjs/common';
import type { ListingEntity } from '../../../domain/entities/listing.entity.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';

/** Label used for the listing's primary direct-trade pin (not in preferred_trade_locations). */
export const PRIMARY_LISTING_LOCATION_LABEL = 'Primary';

export interface ListingMeetingLocationOption {
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export async function requireListingForChat(
  products: IProductRepository,
  listingId: string,
): Promise<ListingEntity> {
  const listing = await products.findById(listingId);
  if (!listing) {
    throw new NotFoundException('Listing not found');
  }
  return listing;
}

/** Meeting options from product creation: primary pin + up to 3 preferred spots. */
export function buildListingMeetingLocations(
  listing: ListingEntity,
): ListingMeetingLocationOption[] {
  const options: ListingMeetingLocationOption[] = [];

  if (listing.directTradeLocation) {
    options.push({
      label: PRIMARY_LISTING_LOCATION_LABEL,
      address: listing.directTradeLocation,
      latitude: listing.directTradeLatitude,
      longitude: listing.directTradeLongitude,
    });
  }

  for (const loc of listing.preferredLocations) {
    options.push({
      label: loc.label,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
  }

  return options;
}

export function findListingMeetingLocation(
  listing: ListingEntity,
  locationLabel: string,
): ListingMeetingLocationOption | undefined {
  return buildListingMeetingLocations(listing).find(
    (loc) => loc.label === locationLabel,
  );
}
