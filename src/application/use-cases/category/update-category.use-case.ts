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
import { UpdateCategoryDto } from '../../dtos/category/update-category.dto.js';
import { CategoryResponseDto } from '../../dtos/category/category-response.dto.js';
import { assertAdmin, toSlug } from './_helpers.js';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await assertAdmin(this.userRepository, adminId);
    const existing = await this.categoryRepository.findById(categoryId);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parentId && dto.parentId === categoryId) {
      throw new ConflictException('Category cannot be its own parent');
    }

    if (dto.parentId) {
      await this.assertNoCycle(dto.parentId, categoryId);
    }

    let slug = dto.slug;
    if (!slug && dto.name?.trim()) {
      slug = toSlug(dto.name);
    }
    if (slug) {
      const bySlug = await this.categoryRepository.findBySlug(slug);
      if (bySlug && bySlug.id !== categoryId) {
        throw new ConflictException('Category slug already exists');
      }
    }

    const updated = await this.categoryRepository.update(categoryId, {
      name: dto.name?.trim(),
      slug,
      icon: dto.icon,
      sortOrder: dto.sortOrder,
      parentId: dto.parentId,
    });
    return new CategoryResponseDto(updated);
  }

  private async assertNoCycle(
    parentId: string,
    categoryId: string,
  ): Promise<void> {
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === categoryId) {
        throw new ConflictException('Category hierarchy cycle is not allowed');
      }
      const row = await this.categoryRepository.findById(cursor);
      if (!row) {
        throw new NotFoundException('Parent category not found');
      }
      cursor = row.parentId;
    }
  }
}
