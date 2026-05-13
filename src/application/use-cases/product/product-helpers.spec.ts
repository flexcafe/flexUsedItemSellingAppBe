import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertActiveCategory,
  assertNotBlank,
  assertProductInputRules,
  mergeListingDeliveryForUpdate,
} from './_helpers.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface.js';
import { jest } from '@jest/globals';

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

  it('rejects missing delivery fee payer when delivery is enabled', () => {
    expect(() =>
      assertProductInputRules({
        isDeliveryAvailable: true,
        deliveryFeePayer: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('allows delivery when payer is BUYER or SELLER', () => {
    expect(() =>
      assertProductInputRules({
        isDeliveryAvailable: true,
        deliveryFeePayer: DeliveryFeePayer.SELLER,
      }),
    ).not.toThrow();
  });

  it('validates merged delivery on partial update context', () => {
    expect(() =>
      assertProductInputRules({
        deliveryEffective: {
          isDeliveryAvailable: true,
          deliveryFeePayer: null,
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('mergeListingDeliveryForUpdate clears payer when disabling delivery', () => {
    expect(
      mergeListingDeliveryForUpdate(
        {
          isDeliveryAvailable: true,
          deliveryFeePayer: DeliveryFeePayer.BUYER,
        },
        { isDeliveryAvailable: false },
      ),
    ).toEqual({
      isDeliveryAvailable: false,
      deliveryFeePayer: null,
    });
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

describe('assertActiveCategory (product ↔ category)', () => {
  it('throws NotFound when category does not exist', async () => {
    const categoryRepo = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<Pick<ICategoryRepository, 'findById'>>;

    await expect(
      assertActiveCategory(categoryRepo as ICategoryRepository, 'c1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFound when category is inactive', async () => {
    const categoryRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'c1',
        isActive: false,
      }),
    } as unknown as jest.Mocked<Pick<ICategoryRepository, 'findById'>>;

    await expect(
      assertActiveCategory(categoryRepo as ICategoryRepository, 'c1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves when category is active', async () => {
    const categoryRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'c1',
        isActive: true,
      }),
    } as unknown as jest.Mocked<Pick<ICategoryRepository, 'findById'>>;

    await expect(
      assertActiveCategory(categoryRepo as ICategoryRepository, 'c1'),
    ).resolves.toBeUndefined();
    expect(categoryRepo.findById).toHaveBeenCalledWith('c1');
  });
});
