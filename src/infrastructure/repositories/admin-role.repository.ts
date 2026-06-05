import PrismaPkg from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AdminPermission } from '../../domain/enums/admin-permission.enum.js';
import type {
  AdminRoleData,
  CreateAdminRoleData,
  IAdminRoleRepository,
} from '../../domain/repositories/admin-role.repository.interface.js';

@Injectable()
export class AdminRoleRepository implements IAdminRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isRootAdminUser(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        isBanned: true,
        adminRole: {
          select: {
            name: true,
            isSystem: true,
          },
        },
      },
    });
    return (
      row?.isActive === true &&
      row.isBanned === false &&
      row?.adminRole?.isSystem === true && row.adminRole.name === 'ROOT_ADMIN'
    );
  }

  async findById(id: string): Promise<AdminRoleData | null> {
    const row = await this.prisma.adminRole.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });
    return row ? this.toData(row) : null;
  }

  async findByUserId(userId: string): Promise<AdminRoleData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        adminRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!user?.adminRole) return null;
    return this.toData(
      user.adminRole as Awaited<
        ReturnType<PrismaService['adminRole']['findUnique']>
      > & { permissions: { permission: string }[] },
    );
  }

  async findByName(name: string): Promise<AdminRoleData | null> {
    const row = await this.prisma.adminRole.findUnique({
      where: { name },
      include: {
        permissions: true,
      },
    });
    return row ? this.toData(row) : null;
  }

  async create(data: CreateAdminRoleData): Promise<AdminRoleData> {
    const permissions = [...new Set(data.permissions)];
    const row = await this.prisma.adminRole.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isSystem: false,
        permissions: {
          createMany: {
            data: permissions.map((permission) => ({
              permission: this.toPrismaPermission(permission),
            })),
          },
        },
      },
      include: {
        permissions: true,
      },
    });
    return this.toData(row);
  }

  async listAll(): Promise<AdminRoleData[]> {
    const rows = await this.prisma.adminRole.findMany({
      include: {
        permissions: true,
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toData(r));
  }

  private toPrismaPermission(
    permission: AdminPermission,
  ): keyof typeof PrismaPkg.AdminPermission {
    return permission as keyof typeof PrismaPkg.AdminPermission;
  }

  private toData(
    row: Awaited<ReturnType<PrismaService['adminRole']['findUnique']>> & {
      permissions: { permission: string }[];
    },
  ): AdminRoleData {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isSystem: row.isSystem,
      permissions: row.permissions
        .map((p) => p.permission as AdminPermission)
        .sort(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
