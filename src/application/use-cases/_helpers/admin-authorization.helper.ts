import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

export async function requireActiveAdmin(
  users: IUserRepository,
  userId: string,
  notFoundMessage = 'Admin user not found',
): Promise<UserEntity> {
  const admin = await users.findById(userId);
  if (!admin) {
    throw new NotFoundException(notFoundMessage);
  }
  if (!admin.isActiveUser()) {
    throw new UnauthorizedException('Account is deactivated or banned');
  }
  if (!admin.isAdmin()) {
    throw new ForbiddenException('Only admin users can perform this action');
  }
  return admin;
}

export async function requireAdminPermission(
  users: IUserRepository,
  userId: string,
  permission: AdminPermission,
  notFoundMessage = 'Admin user not found',
): Promise<UserEntity> {
  const admin = await requireActiveAdmin(users, userId, notFoundMessage);
  const role = await users.getAdminRoleByUserId(userId);
  if (!role) {
    throw new ForbiddenException('Admin role not found for this user');
  }
  if (role.isSystem && role.name === 'ROOT_ADMIN') {
    return admin;
  }
  if (!role.permissions.includes(permission)) {
    throw new ForbiddenException(`Missing admin permission: ${permission}`);
  }
  return admin;
}
