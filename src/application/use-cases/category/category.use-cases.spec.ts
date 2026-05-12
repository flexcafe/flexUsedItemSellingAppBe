import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { CreateCategoryUseCase } from './create-category.use-case.js';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

function buildCategoryRepoMock(): jest.Mocked<ICategoryRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    findChildren: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isUsedByListings: jest.fn(),
  };
}

function buildUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

describe(CreateCategoryUseCase.name, () => {
  it('rejects non-admin users', async () => {
    const categoryRepo = buildCategoryRepoMock();
    const userRepo = buildUserRepoMock();
    userRepo.findById.mockResolvedValue({
      id: 'u1',
      isAdmin: () => false,
    } as any);

    const useCase = new CreateCategoryUseCase(categoryRepo, userRepo);
    await expect(
      useCase.execute('u1', {
        name: 'Mobile',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
