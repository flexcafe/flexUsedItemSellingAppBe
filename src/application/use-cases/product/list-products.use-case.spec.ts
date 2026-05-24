import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ListProductsUseCase } from './list-products.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';

function buildProductRepoMock(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForSeller: jest.fn(),
    findBySeller: jest.fn(),
    updateBySeller: jest.fn(),
    markAsSold: jest.fn(),
    softDeleteBySeller: jest.fn(),
    search: jest.fn(),
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
    const useCase = new ListProductsUseCase(repo, buildConfigMock());

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
});
