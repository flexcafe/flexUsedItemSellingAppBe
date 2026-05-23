import { ForbiddenException } from '@nestjs/common';
import type { IAdminRoleRepository } from '../../../domain/repositories/admin-role.repository.interface.js';

export async function assertRootAdmin(
  roles: IAdminRoleRepository,
  userId: string,
): Promise<void> {
  const isRoot = await roles.isRootAdminUser(userId);
  if (!isRoot) {
    throw new ForbiddenException('Only root admin can perform this action');
  }
}
