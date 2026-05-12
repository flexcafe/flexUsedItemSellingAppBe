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
import { CreateCategoryDto } from '../../dtos/category/create-category.dto.js';
import { CategoryResponseDto } from '../../dtos/category/category-response.dto.js';
import { assertAdmin, toSlug } from './_helpers.js';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await assertAdmin(this.userRepository, adminId);
    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }
    const slug = dto.slug?.trim() || toSlug(dto.name);
    const bySlug = await this.categoryRepository.findBySlug(slug);
    if (bySlug) {
      throw new ConflictException('Category slug already exists');
    }
    const row = await this.categoryRepository.create({
      name: dto.name.trim(),
      slug,
      icon: dto.icon,
      sortOrder: dto.sortOrder ?? 0,
      isActive: true,
      parentId: dto.parentId,
    });
    return new CategoryResponseDto(row);
  }
}
