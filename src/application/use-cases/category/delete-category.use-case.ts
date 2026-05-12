import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { assertAdmin } from './_helpers.js';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(adminId: string, categoryId: string): Promise<void> {
    await assertAdmin(this.userRepository, adminId);
    const existing = await this.categoryRepository.findById(categoryId);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const children = await this.categoryRepository.findChildren(categoryId);
    if (children.length > 0) {
      throw new ConflictException(
        'Cannot delete a category that has child categories',
      );
    }
    const used = await this.categoryRepository.isUsedByListings(categoryId);
    if (used) {
      throw new ConflictException('Cannot delete a category used by products');
    }
    await this.categoryRepository.delete(categoryId);
  }
}
