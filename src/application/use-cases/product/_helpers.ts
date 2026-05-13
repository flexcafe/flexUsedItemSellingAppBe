import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';

export function mergeListingDeliveryForUpdate(
  existing: {
    isDeliveryAvailable: boolean;
    deliveryFeePayer: DeliveryFeePayer | null;
  },
  dto: {
    isDeliveryAvailable?: boolean;
    deliveryFeePayer?: DeliveryFeePayer | null;
  },
): { isDeliveryAvailable: boolean; deliveryFeePayer: DeliveryFeePayer | null } {
  const isDeliveryAvailable =
    dto.isDeliveryAvailable !== undefined
      ? dto.isDeliveryAvailable
      : existing.isDeliveryAvailable;

  let deliveryFeePayer: DeliveryFeePayer | null;
  if (dto.isDeliveryAvailable === false) {
    deliveryFeePayer = null;
  } else if (dto.deliveryFeePayer !== undefined) {
    deliveryFeePayer = dto.deliveryFeePayer;
  } else {
    deliveryFeePayer = existing.deliveryFeePayer;
  }

  return { isDeliveryAvailable, deliveryFeePayer };
}

export function assertProductInputRules(params: {
  images?: string[];
  preferredLocations?: unknown[];
  paymentMethods?: PaymentMethod[];
  isDeliveryAvailable?: boolean;
  deliveryFeePayer?: DeliveryFeePayer | null;
  /** When set (partial PATCH), delivery invariants apply to merged listing state. */
  deliveryEffective?: {
    isDeliveryAvailable: boolean;
    deliveryFeePayer: DeliveryFeePayer | null;
  };
  directTradeLatitude?: number | null;
  directTradeLongitude?: number | null;
}): void {
  if (params.images && params.images.length > 5) {
    throw new BadRequestException('Product photo limit is 5');
  }
  if (params.preferredLocations && params.preferredLocations.length > 3) {
    throw new BadRequestException('Preferred trade location limit is 3');
  }
  if (params.paymentMethods && params.paymentMethods.length === 0) {
    throw new BadRequestException('At least one payment method is required');
  }
  if (params.paymentMethods) {
    const uniq = new Set(params.paymentMethods);
    if (uniq.size !== params.paymentMethods.length) {
      throw new BadRequestException(
        'Duplicate payment methods are not allowed',
      );
    }
  }
  if (
    params.isDeliveryAvailable === false &&
    params.deliveryFeePayer !== undefined &&
    params.deliveryFeePayer !== null
  ) {
    throw new BadRequestException(
      'deliveryFeePayer is only allowed when delivery is available',
    );
  }

  const effIs = params.deliveryEffective
    ? params.deliveryEffective.isDeliveryAvailable
    : params.isDeliveryAvailable;
  const effPayer = params.deliveryEffective
    ? params.deliveryEffective.deliveryFeePayer
    : (params.deliveryFeePayer ?? null);

  if (effIs === true) {
    if (
      effPayer !== DeliveryFeePayer.BUYER &&
      effPayer !== DeliveryFeePayer.SELLER
    ) {
      throw new BadRequestException(
        'deliveryFeePayer must be BUYER or SELLER when delivery is available',
      );
    }
  }
  if (effIs === false && effPayer !== null) {
    throw new BadRequestException(
      'deliveryFeePayer must be omitted when delivery is not available',
    );
  }
  const hasLat = params.directTradeLatitude != null;
  const hasLng = params.directTradeLongitude != null;
  if (hasLat !== hasLng) {
    throw new BadRequestException(
      'directTradeLatitude and directTradeLongitude must be provided together',
    );
  }
}

export function assertNotBlank(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(`${fieldName} must not be blank`);
  }
  return trimmed;
}

export async function assertActiveCategory(
  categoryRepository: ICategoryRepository,
  categoryId: string,
): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category || !category.isActive) {
    throw new NotFoundException('Active category not found');
  }
}
