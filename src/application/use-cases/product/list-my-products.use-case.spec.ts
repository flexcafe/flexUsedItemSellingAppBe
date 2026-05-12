import { jest } from '@jest/globals';
import { ListMyProductsUseCase } from './list-my-products.use-case.js';
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

describe(ListMyProductsUseCase.name, () => {
  it('passes pagination parameters for seller listings', async () => {
    const repo = buildProductRepoMock();
    repo.findBySeller.mockResolvedValue({ rows: [], total: 0 });
    const useCase = new ListMyProductsUseCase(repo);

    await useCase.execute('u-1', { page: 3, limit: 20 });

    expect(repo.findBySeller).toHaveBeenCalledWith({
      sellerId: 'u-1',
      skip: 40,
      take: 20,
    });
  });
});
