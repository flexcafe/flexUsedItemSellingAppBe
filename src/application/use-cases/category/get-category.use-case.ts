import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface.js';
import { CategoryResponseDto } from '../../dtos/category/category-response.dto.js';

@Injectable()
export class GetCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    id: string,
    options?: { requireActive?: boolean },
  ): Promise<CategoryResponseDto> {
    const row = await this.categoryRepository.findById(id);
    if (!row || (options?.requireActive === true && !row.isActive)) {
      throw new NotFoundException('Category not found');
    }
    return new CategoryResponseDto(row);
  }
}
