import { ApiProperty } from '@nestjs/swagger';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import type { AdminRoleData } from '../../../domain/repositories/admin-role.repository.interface.js';

export class AdminRoleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty({ enum: AdminPermission, isArray: true })
  permissions: AdminPermission[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(data: AdminRoleData) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.isSystem = data.isSystem;
    this.permissions = data.permissions;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
