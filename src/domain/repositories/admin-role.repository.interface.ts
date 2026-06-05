import { AdminPermission } from '../enums/admin-permission.enum.js';

export interface AdminRoleData {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: AdminPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdminRoleData {
  name: string;
  description?: string;
  permissions: AdminPermission[];
}

export interface IAdminRoleRepository {
  isRootAdminUser(userId: string): Promise<boolean>;
  findByName(name: string): Promise<AdminRoleData | null>;
  create(data: CreateAdminRoleData): Promise<AdminRoleData>;
  listAll(): Promise<AdminRoleData[]>;
  findByUserId(userId: string): Promise<AdminRoleData | null>;
  findById(id: string): Promise<AdminRoleData | null>;
}

export const ADMIN_ROLE_REPOSITORY = Symbol('ADMIN_ROLE_REPOSITORY');
