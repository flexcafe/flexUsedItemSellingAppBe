import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionReviewUseCase } from './create-transaction-review.use-case.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';

function buildPointsRepoMock(): jest.Mocked<IPointsRepository> {
  return {
    getUserPointsSummary: jest.fn(),
    getUserTransactionStats: jest.fn(),
    getPublicUserProfile: jest.fn(),
    getSellerReviews: jest.fn(),
    getStarPointConfigs: jest.fn(),
    upsertStarPointConfigs: jest.fn(),
    getRankConfigs: jest.fn(),
    upsertRankConfigs: jest.fn(),
    findTransactionReviewContext: jest.fn(),
    hasReview: jest.fn(),
    createReviewAndAwardPoints: jest.fn(),
    createWithdrawalRequest: jest.fn(),
    findUserWithdrawalRequests: jest.fn(),
    findWithdrawalRequests: jest.fn(),
    approveWithdrawal: jest.fn(),
    rejectWithdrawal: jest.fn(),
    markWithdrawalPaid: jest.fn(),
    grantAccountLifetimeMilestoneBonus: jest.fn(),
    deductPointsForTransactionCancellation: jest.fn(),
  };
}

describe(CreateTransactionReviewUseCase.name, () => {
  it('allows buyer review after buyer completed (no need to wait seller)', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.BUYER_COMPLETED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: true,
      sellerCompleted: false,
    });
    points.hasReview.mockResolvedValue(false);
    points.createReviewAndAwardPoints.mockResolvedValue({
      id: 'r-1',
      transactionId: 'tx-1',
      reviewerId: 'buyer-1',
      revieweeId: 'seller-1',
      stars: 5,
      comment: null,
      pointsAwarded: 5,
      createdAt: new Date(),
    });

    const useCase = new CreateTransactionReviewUseCase(points);
    const result = await useCase.execute('tx-1', 'buyer-1', { stars: 5 });

    expect(result.id).toBe('r-1');
    expect(points.createReviewAndAwardPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-1',
        reviewerId: 'buyer-1',
        revieweeId: 'seller-1',
      }),
    );
  });

  it('allows seller review after seller completed (no need to wait buyer)', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.SELLER_COMPLETED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: false,
      sellerCompleted: true,
    });
    points.hasReview.mockResolvedValue(false);
    points.createReviewAndAwardPoints.mockResolvedValue({
      id: 'r-2',
      transactionId: 'tx-1',
      reviewerId: 'seller-1',
      revieweeId: 'buyer-1',
      stars: 4,
      comment: 'Smooth trade',
      pointsAwarded: 4,
      createdAt: new Date(),
    });

    const useCase = new CreateTransactionReviewUseCase(points);
    const result = await useCase.execute('tx-1', 'seller-1', {
      stars: 4,
      comment: 'Smooth trade',
    });

    expect(result.id).toBe('r-2');
    expect(points.createReviewAndAwardPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewerId: 'seller-1',
        revieweeId: 'buyer-1',
      }),
    );
  });

  it('rejects when reviewer has not completed yet', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.BUYER_COMPLETED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: true,
      sellerCompleted: false,
    });

    const useCase = new CreateTransactionReviewUseCase(points);
    await expect(
      useCase.execute('tx-1', 'seller-1', { stars: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when transaction not in a completable/reviewable status', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.SAFE_PAYMENT_PENDING,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: false,
      sellerCompleted: false,
    });

    const useCase = new CreateTransactionReviewUseCase(points);
    await expect(
      useCase.execute('tx-1', 'buyer-1', { stars: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when transaction is missing', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue(null);
    const useCase = new CreateTransactionReviewUseCase(points);
    await expect(
      useCase.execute('tx-1', 'buyer-1', { stars: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when reviewer is not buyer or seller', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.COMPLETED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: true,
      sellerCompleted: true,
    });

    const useCase = new CreateTransactionReviewUseCase(points);
    await expect(
      useCase.execute('tx-1', 'other-1', { stars: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate review submission by same reviewer', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.COMPLETED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: true,
      sellerCompleted: true,
    });
    points.hasReview.mockResolvedValue(true);

    const useCase = new CreateTransactionReviewUseCase(points);
    await expect(
      useCase.execute('tx-1', 'buyer-1', { stars: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(points.createReviewAndAwardPoints).not.toHaveBeenCalled();
  });

  it('rejects inconsistent state when status is COMPLETED but reviewer flag is false', async () => {
    const points = buildPointsRepoMock();
    points.findTransactionReviewContext.mockResolvedValue({
      id: 'tx-1',
      status: TransactionStatus.COMPLETED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerCompleted: true,
      sellerCompleted: false,
    });

    const useCase = new CreateTransactionReviewUseCase(points);
    await expect(
      useCase.execute('tx-1', 'seller-1', { stars: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
