import { jest } from '@jest/globals';
import { ListProductsUseCase } from './list-products.use-case.js';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface.js';

function buildProductRepoMock(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findBySeller: jest.fn(),
    updateBySeller: jest.fn(),
    softDeleteBySeller: jest.fn(),
    search: jest.fn(),
  };
}

describe(ListProductsUseCase.name, () => {
  it('clamps page and limit into allowed boundaries', async () => {
    const repo = buildProductRepoMock();
    repo.search.mockResolvedValue({ rows: [], total: 0 });
    const useCase = new ListProductsUseCase(repo);

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

