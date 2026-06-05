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
import { AdminUserListDto } from '../../dtos/admin-users/admin-user-list.dto.js';
import { assertRootAdmin } from '../admin-roles/_helpers.js';

@Injectable()
export class DemoteAdminUserUseCase {
  private readonly logger = new Logger(DemoteAdminUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly adminRoleRepository: IAdminRoleRepository,
  ) {}

  async execute(
    rootAdminId: string,
    targetUserId: string,
  ): Promise<AdminUserListDto> {
    await assertRootAdmin(this.adminRoleRepository, rootAdminId);

    // Prevent root from demoting themselves
    if (targetUserId === rootAdminId) {
      throw new BadRequestException('Cannot demote yourself');
    }

    // Find target user
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!targetUser.isAdmin()) {
      throw new BadRequestException('User is not an admin');
    }

    // Demote by setting adminRoleId to null
    const updatedUser = await this.userRepository.update(targetUserId, {
      adminRoleId: null,
      authTokenVersion: targetUser.authTokenVersion + 1,
    });

    this.logger.log(`Admin user ${targetUserId} demoted to client`);

    return new AdminUserListDto({
      id: updatedUser.id,
      nickname: updatedUser.nickname,
      phone: updatedUser.phone,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
      isBanned: updatedUser.isBanned,
      adminRoleId: null,
      adminRoleName: null,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  }
}
