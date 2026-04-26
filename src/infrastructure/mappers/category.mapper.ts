import { Category as PrismaCategory } from '@prisma/client';
import { CategoryEntity } from '../../domain/entities/category.entity.js';

type PrismaCategoryWithRelations = PrismaCategory & {
  parent?: PrismaCategory | null;
  children?: PrismaCategory[];
};

export class CategoryMapper {
  static toDomain(prisma: PrismaCategoryWithRelations): CategoryEntity {
    return new CategoryEntity({
      id: prisma.id,
      name: prisma.name,
      slug: prisma.slug,
      icon: prisma.icon,
      parentId: prisma.parentId,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      parent: prisma.parent
        ? CategoryMapper.toDomain(prisma.parent)
        : undefined,
      children: prisma.children?.map((c) => CategoryMapper.toDomain(c)),
    });
  }

  static toDomainList(
    prismaList: PrismaCategoryWithRelations[],
  ): CategoryEntity[] {
    return prismaList.map((p) => CategoryMapper.toDomain(p));
  }
}
