import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface.js';
import { CategoryResponseDto } from '../../dtos/category/category-response.dto.js';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(includeInactive = true): Promise<CategoryResponseDto[]> {
    const rows = await this.categoryRepository.findAll(includeInactive);
    return rows.map((r) => new CategoryResponseDto(r));
  }
}
