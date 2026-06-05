import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  ADMIN_ROLE_REPOSITORY,
  type IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import type { UpdateAdminUserRoleDto } from '../../dtos/admin-users/update-admin-user-role.dto.js';
import { AdminUserListDto } from '../../dtos/admin-users/admin-user-list.dto.js';
import { assertRootAdmin } from '../admin-roles/_helpers.js';

@Injectable()
export class UpdateAdminUserRoleUseCase {
  private readonly logger = new Logger(UpdateAdminUserRoleUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly adminRoleRepository: IAdminRoleRepository,
  ) {}

  async execute(
    rootAdminId: string,
    targetUserId: string,
    dto: UpdateAdminUserRoleDto,
  ): Promise<AdminUserListDto> {
    await assertRootAdmin(this.adminRoleRepository, rootAdminId);

    // Prevent root from demoting themselves
    if (targetUserId === rootAdminId) {
      throw new BadRequestException('Cannot change your own admin role');
    }

    // Find target user
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Validate new role exists
    const newRole = await this.adminRoleRepository.findById(dto.adminRoleId);
    if (!newRole) {
      throw new NotFoundException('Admin role not found');
    }

    // Prevent assigning ROOT_ADMIN role
    if (newRole.isSystem && newRole.name === 'ROOT_ADMIN') {
      throw new BadRequestException('ROOT_ADMIN role cannot be assigned');
    }

    // Update admin role
    const updatedUser = await this.userRepository.update(targetUserId, {
      adminRoleId: newRole.id,
      authTokenVersion: targetUser.authTokenVersion + 1,
    });

    this.logger.log(
      `Admin user ${targetUserId} role changed to ${newRole.name}`,
    );

    return new AdminUserListDto({
      id: updatedUser.id,
      nickname: updatedUser.nickname,
      phone: updatedUser.phone,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
      isBanned: updatedUser.isBanned,
      adminRoleId: updatedUser.adminRoleId,
      adminRoleName: newRole.name,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  }
}
