import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CategoryMapper } from '../mappers/category.mapper.js';
import { CategoryEntity } from '../../domain/entities/category.entity.js';
import type {
  ICategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from '../../domain/repositories/category.repository.interface.js';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const category = await this.prisma.category.create({ data });
    return CategoryMapper.toDomain(category);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    return category ? CategoryMapper.toDomain(category) : null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true },
    });
    return category ? CategoryMapper.toDomain(category) : null;
  }

  async findAll(): Promise<CategoryEntity[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
    return CategoryMapper.toDomainList(categories);
  }

  async findChildren(parentId: string): Promise<CategoryEntity[]> {
    const children = await this.prisma.category.findMany({
      where: { parentId },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
    return CategoryMapper.toDomainList(children);
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    const category = await this.prisma.category.update({
      where: { id },
      data,
      include: { children: true },
    });
    return CategoryMapper.toDomain(category);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.category.delete({ where: { id } });
    return true;
  }
}
