import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  ADMIN_ROLE_REPOSITORY,
  type IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import { AdminUserListDto } from '../../dtos/admin-users/admin-user-list.dto.js';
import { assertRootAdmin } from '../admin-roles/_helpers.js';

@Injectable()
export class ListAdminUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly adminRoleRepository: IAdminRoleRepository,
  ) {}

  async execute(rootAdminId: string): Promise<AdminUserListDto[]> {
    await assertRootAdmin(this.adminRoleRepository, rootAdminId);

    const adminUsers = await this.userRepository.listAdminUsers();
    const allRoles = await this.adminRoleRepository.listAll();
    const roleMap = new Map(allRoles.map((r) => [r.id, r.name]));

    return adminUsers.map(
      (u) =>
        new AdminUserListDto({
          id: u.id,
          nickname: u.nickname,
          phone: u.phone,
          email: u.email,
          isActive: u.isActive,
          isBanned: u.isBanned,
          adminRoleId: u.adminRoleId,
          adminRoleName: u.adminRoleId ? roleMap.get(u.adminRoleId) ?? null : null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }),
    );
  }
}