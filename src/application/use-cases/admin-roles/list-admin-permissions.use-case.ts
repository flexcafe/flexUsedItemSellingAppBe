import { Inject, Injectable } from '@nestjs/common';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import {
  ADMIN_ROLE_REPOSITORY,
  type IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import { AdminPermissionListDto } from '../../dtos/admin-roles/admin-permission-list.dto.js';
import { assertRootAdmin } from './_helpers.js';

@Injectable()
export class ListAdminPermissionsUseCase {
  constructor(
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly roles: IAdminRoleRepository,
  ) {}

  async execute(rootAdminId: string): Promise<AdminPermissionListDto> {
    await assertRootAdmin(this.roles, rootAdminId);
    return new AdminPermissionListDto(Object.values(AdminPermission));
  }
}
