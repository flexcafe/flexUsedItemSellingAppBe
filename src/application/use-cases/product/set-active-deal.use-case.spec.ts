import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SetActiveDealUseCase } from './set-active-deal.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import type { IChatRepository } from '../../../domain/repositories/chat.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';

function buildProductRepoMock(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForSeller: jest.fn(),
    getActiveDealChatRoomId: jest.fn(),
    setActiveDealChatRoomId: jest.fn(),
    findBySeller: jest.fn(),
    updateBySeller: jest.fn(),
    markAsSold: jest.fn(),
    softDeleteBySeller: jest.fn(),
    search: jest.fn(),
  };
}

function buildChatRepoMock(): jest.Mocked<IChatRepository> {
  return {
    getOrCreateRoom: jest.fn(),
    findRoomById: jest.fn(),
    listRoomsForUser: jest.fn(),
    listMessagesByRoom: jest.fn(),
    createMessage: jest.fn(),
    markRoomMessagesRead: jest.fn(),
    getOrCreateTransaction: jest.fn(),
    findTransactionById: jest.fn(),
    findTransactionForChat: jest.fn(),
    findBlockingSafePaymentForChat: jest.fn(),
    findDirectTradeIdByTransactionId: jest.fn(),
    findDirectTradeByTransactionId: jest.fn(),
    hasOpenDirectTradeForListing: jest.fn(),
    upsertDirectTrade: jest.fn(),
    startLocationShare: jest.fn(),
    updateLocationShare: jest.fn(),
    stopLocationShare: jest.fn(),
    stopAllLocationSharesForChatRoom: jest.fn(),
    requestSafePayment: jest.fn(),
    sendSafePaymentInstruction: jest.fn(),
    findSafePaymentStatusByChatRoom: jest.fn(),
    submitSafePayment: jest.fn(),
    markSafePaymentReceived: jest.fn(),
    markSafePaymentTransferred: jest.fn(),
    markTransactionCompletedByUser: jest.fn(),
    markTransactionCancelledByUser: jest.fn(),
    listPendingSafePayments: jest.fn(),
    listAwaitingSafePaymentInstructions: jest.fn(),
  } as unknown as jest.Mocked<IChatRepository>;
}

function buildUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(() =>
      Promise.resolve({ isActiveUser: () => true } as never),
    ),
    createNotification: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

function listingForSeller() {
  return {
    id: 'listing-1',
    isDeleted: false,
    status: ListingStatus.ACTIVE,
  } as never;
}

describe(SetActiveDealUseCase.name, () => {
  it('notifies selected buyer when seller sets active deal', async () => {
    const products = buildProductRepoMock();
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    products.findByIdForSeller.mockResolvedValue(listingForSeller());
    products.getActiveDealChatRoomId.mockResolvedValue(null);
    chats.findRoomById.mockResolvedValue({
      id: 'room-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
    });
    const useCase = new SetActiveDealUseCase(products, chats, users);

    await useCase.execute('seller-1', 'listing-1', 'room-1');

    expect(products.setActiveDealChatRoomId).toHaveBeenCalledWith(
      'listing-1',
      'seller-1',
      'room-1',
    );
    expect(users.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-1',
        eventKey: 'CHAT_ACTIVE_DEAL_SELECTED_BUYER',
      }),
    );
  });

  it('notifies previous buyer when active deal is replaced', async () => {
    const products = buildProductRepoMock();
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    products.findByIdForSeller.mockResolvedValue(listingForSeller());
    products.getActiveDealChatRoomId.mockResolvedValue('room-old');
    chats.findRoomById
      .mockResolvedValueOnce({
        id: 'room-new',
        listingId: 'listing-1',
        buyerId: 'buyer-new',
        sellerId: 'seller-1',
      })
      .mockResolvedValueOnce({
        id: 'room-old',
        listingId: 'listing-1',
        buyerId: 'buyer-old',
        sellerId: 'seller-1',
      });
    const useCase = new SetActiveDealUseCase(products, chats, users);

    await useCase.execute('seller-1', 'listing-1', 'room-new');

    expect(users.createNotification).toHaveBeenCalledTimes(2);
    expect(users.createNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'buyer-new',
        eventKey: 'CHAT_ACTIVE_DEAL_SELECTED_BUYER',
      }),
    );
    expect(users.createNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'buyer-old',
        eventKey: 'CHAT_ACTIVE_DEAL_REPLACED_BUYER',
      }),
    );
  });

  it('does not notify when setting same active deal again', async () => {
    const products = buildProductRepoMock();
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    products.findByIdForSeller.mockResolvedValue(listingForSeller());
    products.getActiveDealChatRoomId.mockResolvedValue('room-1');
    chats.findRoomById.mockResolvedValue({
      id: 'room-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
    });
    const useCase = new SetActiveDealUseCase(products, chats, users);

    await useCase.execute('seller-1', 'listing-1', 'room-1');

    expect(users.createNotification).not.toHaveBeenCalled();
  });

  it('clears active deal without notifications', async () => {
    const products = buildProductRepoMock();
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    products.findByIdForSeller.mockResolvedValue(listingForSeller());
    const useCase = new SetActiveDealUseCase(products, chats, users);

    await useCase.execute('seller-1', 'listing-1', null);

    expect(products.setActiveDealChatRoomId).toHaveBeenCalledWith(
      'listing-1',
      'seller-1',
      null,
    );
    expect(users.createNotification).not.toHaveBeenCalled();
  });

  it('rejects sold listing', async () => {
    const products = buildProductRepoMock();
    products.findByIdForSeller.mockResolvedValue({
      ...listingForSeller(),
      status: ListingStatus.SOLD,
    });
    const useCase = new SetActiveDealUseCase(
      products,
      buildChatRepoMock(),
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute('seller-1', 'listing-1', 'room-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects room that belongs to another seller', async () => {
    const products = buildProductRepoMock();
    const chats = buildChatRepoMock();
    products.findByIdForSeller.mockResolvedValue(listingForSeller());
    chats.findRoomById.mockResolvedValue({
      id: 'room-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-2',
    });
    const useCase = new SetActiveDealUseCase(
      products,
      chats,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute('seller-1', 'listing-1', 'room-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing chat room', async () => {
    const products = buildProductRepoMock();
    const chats = buildChatRepoMock();
    products.findByIdForSeller.mockResolvedValue(listingForSeller());
    chats.findRoomById.mockResolvedValue(null);
    const useCase = new SetActiveDealUseCase(
      products,
      chats,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute('seller-1', 'listing-1', 'room-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
