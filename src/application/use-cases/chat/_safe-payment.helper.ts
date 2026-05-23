import { BadRequestException } from '@nestjs/common';

export function assertListingPriceForSafePayment(price: number): number {
  if (!Number.isFinite(price) || price <= 0) {
    throw new BadRequestException(
      'Listing price is invalid; cannot start safe payment',
    );
  }
  return Math.round(price);
}

export function assertPaymentAmountMatchesExpected(
  expectedAmount: number,
  submittedAmount: number,
): void {
  const expected = Math.round(expectedAmount);
  const submitted = Math.round(submittedAmount);
  if (submitted !== expected) {
    throw new BadRequestException(
      `Payment amount must be exactly ${expected} MMK (listing price)`,
    );
  }
}
