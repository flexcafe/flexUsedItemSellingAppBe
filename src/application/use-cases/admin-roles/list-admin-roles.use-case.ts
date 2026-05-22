import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_ROLE_REPOSITORY,
  type IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import { AdminRoleDto } from '../../dtos/admin-roles/admin-role.dto.js';
import { assertRootAdmin } from './_helpers.js';

@Injectable()
export class ListAdminRolesUseCase {
  constructor(
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly roles: IAdminRoleRepository,
  ) {}

  async execute(rootAdminId: string): Promise<AdminRoleDto[]> {
    await assertRootAdmin(this.roles, rootAdminId);
    const rows = await this.roles.listAll();
    return rows.map((r) => new AdminRoleDto(r));
  }
}
