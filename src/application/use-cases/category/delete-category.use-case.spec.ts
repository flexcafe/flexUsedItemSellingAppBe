import { jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteCategoryUseCase } from './delete-category.use-case.js';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

function buildCategoryRepo(): jest.Mocked<
  Pick<
    ICategoryRepository,
    'findById' | 'findChildren' | 'isUsedByListings' | 'delete'
  >
> {
  return {
    findById: jest.fn(),
    findChildren: jest.fn(),
    isUsedByListings: jest.fn(),
    delete: jest.fn(),
  };
}

function buildUserRepo(admin: boolean): jest.Mocked<Pick<IUserRepository, 'findById'>> {
  return {
    findById: jest.fn().mockResolvedValue({
      id: 'admin1',
      isAdmin: () => admin,
    } as any),
  };
}

describe(DeleteCategoryUseCase.name, () => {
  it('rejects non-admin', async () => {
    const categoryRepo = buildCategoryRepo();
    const userRepo = buildUserRepo(false);
    const uc = new DeleteCategoryUseCase(
      categoryRepo as unknown as ICategoryRepository,
      userRepo as unknown as IUserRepository,
    );
    await expect(uc.execute('u1', 'c1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(categoryRepo.findById).not.toHaveBeenCalled();
  });

  it('throws when category missing', async () => {
    const categoryRepo = buildCategoryRepo();
    categoryRepo.findById.mockResolvedValue(null);
    const userRepo = buildUserRepo(true);
    const uc = new DeleteCategoryUseCase(
      categoryRepo as unknown as ICategoryRepository,
      userRepo as unknown as IUserRepository,
    );
    await expect(uc.execute('admin1', 'c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('conflicts when category has children', async () => {
    const categoryRepo = buildCategoryRepo();
    categoryRepo.findById.mockResolvedValue({
      id: 'c1',
      hasChildren: () => true,
    } as any);
    categoryRepo.findChildren.mockResolvedValue([{ id: 'child' } as any]);
    const userRepo = buildUserRepo(true);
    const uc = new DeleteCategoryUseCase(
      categoryRepo as unknown as ICategoryRepository,
      userRepo as unknown as IUserRepository,
    );
    await expect(uc.execute('admin1', 'c1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(categoryRepo.isUsedByListings).not.toHaveBeenCalled();
  });

  it('conflicts when non-deleted listings use category', async () => {
    const categoryRepo = buildCategoryRepo();
    categoryRepo.findById.mockResolvedValue({ id: 'c1' } as any);
    categoryRepo.findChildren.mockResolvedValue([]);
    categoryRepo.isUsedByListings.mockResolvedValue(true);
    const userRepo = buildUserRepo(true);
    const uc = new DeleteCategoryUseCase(
      categoryRepo as unknown as ICategoryRepository,
      userRepo as unknown as IUserRepository,
    );
    await expect(uc.execute('admin1', 'c1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(categoryRepo.delete).not.toHaveBeenCalled();
  });

  it('deletes when no children and no active listings', async () => {
    const categoryRepo = buildCategoryRepo();
    categoryRepo.findById.mockResolvedValue({ id: 'c1' } as any);
    categoryRepo.findChildren.mockResolvedValue([]);
    categoryRepo.isUsedByListings.mockResolvedValue(false);
    categoryRepo.delete.mockResolvedValue(true);
    const userRepo = buildUserRepo(true);
    const uc = new DeleteCategoryUseCase(
      categoryRepo as unknown as ICategoryRepository,
      userRepo as unknown as IUserRepository,
    );
    await uc.execute('admin1', 'c1');
    expect(categoryRepo.delete).toHaveBeenCalledWith('c1');
  });
});
