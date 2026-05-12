import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '../../../domain/entities/category.entity.js';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ nullable: true })
  icon: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  parentId: string | null;

  @ApiProperty({ type: CategoryResponseDto, isArray: true })
  children: CategoryResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(entity: CategoryEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.slug = entity.slug;
    this.icon = entity.icon;
    this.sortOrder = entity.sortOrder;
    this.isActive = entity.isActive;
    this.parentId = entity.parentId;
    this.children = (entity.children ?? []).map(
      (c) => new CategoryResponseDto(c),
    );
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
