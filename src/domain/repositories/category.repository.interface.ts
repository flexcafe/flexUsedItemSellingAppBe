import { CategoryEntity } from '../entities/category.entity.js';

export interface CreateCategoryData {
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  icon?: string;
}

export interface ICategoryRepository {
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  findAll(): Promise<CategoryEntity[]>;
  findChildren(parentId: string): Promise<CategoryEntity[]>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryEntity>;
  delete(id: string): Promise<boolean>;
}

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
