import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';

export class CreateAdminRoleDto {
  @ApiProperty({ example: 'CONTENT_MODERATOR' })
  @IsString()
  @MaxLength(64)
  name: string;

  @ApiPropertyOptional({ example: 'Moderates reports and suggestions only' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: AdminPermission, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(AdminPermission, { each: true })
  permissions: AdminPermission[];
}
