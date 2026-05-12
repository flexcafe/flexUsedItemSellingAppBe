import { BadRequestException } from '@nestjs/common';
import { assertNotBlank, assertProductInputRules } from './_helpers.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';

describe('product helper rules', () => {
  it('rejects duplicate payment methods', () => {
    expect(() =>
      assertProductInputRules({
        paymentMethods: [PaymentMethod.CASH, PaymentMethod.CASH],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects delivery fee payer when delivery is disabled', () => {
    expect(() =>
      assertProductInputRules({
        isDeliveryAvailable: false,
        deliveryFeePayer: DeliveryFeePayer.BUYER,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects partial direct trade coordinate', () => {
    expect(() =>
      assertProductInputRules({
        directTradeLatitude: 16.8,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects blank string fields', () => {
    expect(() => assertNotBlank('  ', 'title')).toThrow(BadRequestException);
  });
});
