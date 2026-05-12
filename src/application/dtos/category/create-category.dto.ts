import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Mobile and Laptop',
    description:
      'Display name. Shown in admin UI and used to derive slug when slug is omitted.',
  })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'mobile-laptop',
    description:
      'URL-safe unique key. If omitted, server generates from name. Must stay unique on create/update.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({
    example: 0,
    description:
      'Sort order among siblings (same parentId). Lower numbers appear first.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    example: '59c148e3-5dc3-42dd-987e-c6b559f0a071',
    description:
      'If set, creates a **child** category under this parent UUID. Omit for a root category. Parent must exist.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
