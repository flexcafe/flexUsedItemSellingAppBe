import { AdminPermission } from '../domain/enums/admin-permission.enum.js';

/** Minimal mock user for requireActiveAdmin / requireAdminPermission. */
export function mockAdminUser(overrides: { id?: string; admin?: boolean } = {}) {
  const admin = overrides.admin ?? true;
  return {
    id: overrides.id ?? 'admin-1',
    isAdmin: () => admin,
    isActiveUser: () => true,
  };
}

export function mockAdminRole(
  permissions: AdminPermission[] = [AdminPermission.MANAGE_CATEGORIES],
) {
  return {
    id: 'role-1',
    name: 'TEST_ADMIN',
    isSystem: false,
    permissions,
  };
}

export function mockRootAdminRole() {
  return {
    id: 'role-root',
    name: 'ROOT_ADMIN',
    isSystem: true,
    permissions: [] as AdminPermission[],
  };
}
