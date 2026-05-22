import { ApiProperty } from '@nestjs/swagger';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';

export class AdminPermissionListDto {
  @ApiProperty({ enum: AdminPermission, isArray: true })
  permissions: AdminPermission[];

  constructor(permissions: AdminPermission[]) {
    this.permissions = permissions;
  }
}
