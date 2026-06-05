import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

export async function assertAdmin(
  userRepository: IUserRepository,
  userId: string,
): Promise<void> {
  await requireAdminPermission(
    userRepository,
    userId,
    AdminPermission.MANAGE_CATEGORIES,
  );
}

export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
