import { BadRequestException } from '@nestjs/common';
import {
  assertListingPriceForSafePayment,
  assertPaymentAmountMatchesExpected,
} from './_safe-payment.helper.js';

describe('_safe-payment.helper', () => {
  describe(assertPaymentAmountMatchesExpected.name, () => {
    it('passes when amounts match', () => {
      expect(() =>
        assertPaymentAmountMatchesExpected(100_000, 100_000),
      ).not.toThrow();
    });

    it('rejects mismatch', () => {
      expect(() =>
        assertPaymentAmountMatchesExpected(100_000, 99_000),
      ).toThrow(BadRequestException);
    });
  });

  describe(assertListingPriceForSafePayment.name, () => {
    it('rejects non-positive price', () => {
      expect(() => assertListingPriceForSafePayment(0)).toThrow(
        BadRequestException,
      );
    });
  });
});
