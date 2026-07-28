import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ListProductsUseCase } from './list-products.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';
import type { IUserBlockRepository } from '../../../domain/repositories/user-block.repository.interface.js';

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

function buildUserBlockRepoMock(): jest.Mocked<IUserBlockRepository> {
  return {
    create: jest.fn(),
    delete: jest.fn(),
    listByBlocker: jest.fn(),
    listBlockedIds: jest.fn(),
    listExcludedUserIdsForViewer: jest.fn(async () => []),
    isBlockedEitherWay: jest.fn(async () => false),
    findBlock: jest.fn(),
  };
}

function buildConfigMock(): ConfigService {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'LISTING_DISPLAY_TIMEZONE') {
        return 'UTC';
      }
      return def;
    }),
  } as unknown as ConfigService;
}

describe(ListProductsUseCase.name, () => {
  it('clamps page and limit into allowed boundaries', async () => {
    const repo = buildProductRepoMock();
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    const useCase = new ListProductsUseCase(
      repo,
      buildUserBlockRepoMock(),
      buildConfigMock(),
    );

    await useCase.execute({
      page: -10 as unknown as number,
      limit: 999 as unknown as number,
    });

    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
      }),
    );
  });

  it('passes excludeSellerIds when viewerUserId is provided', async () => {
    const repo = buildProductRepoMock();
    const blocks = buildUserBlockRepoMock();
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    blocks.listExcludedUserIdsForViewer.mockResolvedValue(['blocked-1']);
    const useCase = new ListProductsUseCase(repo, blocks, buildConfigMock());

    await useCase.execute({ page: 1, limit: 20 }, 'viewer-1');

    expect(blocks.listExcludedUserIdsForViewer).toHaveBeenCalledWith(
      'viewer-1',
    );
    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeSellerIds: ['blocked-1'],
      }),
    );
  });

  it('does not load blocks when viewer is anonymous', async () => {
    const repo = buildProductRepoMock();
    const blocks = buildUserBlockRepoMock();
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    const useCase = new ListProductsUseCase(repo, blocks, buildConfigMock());

    await useCase.execute({ page: 1, limit: 20 });

    expect(blocks.listExcludedUserIdsForViewer).not.toHaveBeenCalled();
    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeSellerIds: undefined,
      }),
    );
  });
});
