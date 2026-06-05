import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';
import { AdminPermission } from '../../domain/enums/admin-permission.enum.js';

const ROOT_ADMIN_ROLE_NAME = 'ROOT_ADMIN';
const ROOT_ADMIN_DESCRIPTION = 'System root admin (bootstrapped)';

const ROOT_ADMIN_PERMISSIONS: AdminPermission[] = [
  AdminPermission.MANAGE_CATEGORIES,
  AdminPermission.MANAGE_SLIDER_ADS,
  AdminPermission.MANAGE_USERS,
  AdminPermission.MANAGE_LISTINGS,
  AdminPermission.MANAGE_WITHDRAWALS,
  AdminPermission.MANAGE_REPORTS,
  AdminPermission.MANAGE_SUGGESTIONS,
  AdminPermission.MANAGE_TRANSACTIONS,
  AdminPermission.MANAGE_SAFE_PAYMENTS,
  AdminPermission.MANAGE_RANK_CONFIG,
  AdminPermission.MANAGE_POINT_CONFIG,
  AdminPermission.VIEW_ANALYTICS,
  AdminPermission.SEND_NOTIFICATIONS,
];

@Injectable()
export class RootAdminIntegrityService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RootAdminIntegrityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const rootRole = await this.prisma.adminRole.upsert({
      where: { name: ROOT_ADMIN_ROLE_NAME },
      create: {
        name: ROOT_ADMIN_ROLE_NAME,
        description: ROOT_ADMIN_DESCRIPTION,
        isSystem: true,
        permissions: {
          createMany: {
            data: ROOT_ADMIN_PERMISSIONS.map((permission) => ({ permission })),
          },
        },
      },
      update: {
        description: ROOT_ADMIN_DESCRIPTION,
        isSystem: true,
        permissions: {
          deleteMany: {},
          createMany: {
            data: ROOT_ADMIN_PERMISSIONS.map((permission) => ({ permission })),
          },
        },
      },
      include: {
        permissions: true,
      },
    });

    const rootEmail = this.configService.get<string>(
      'ROOT_ADMIN_EMAIL',
      'admin@example.com',
    );
    const rootPhone = this.configService.get<string>(
      'ROOT_ADMIN_PHONE',
      '+959000000000',
    );
    const rootNickname = this.configService.get<string>(
      'ROOT_ADMIN_NICKNAME',
      'Root Admin',
    );

    const rootUser =
      (await this.prisma.user.findFirst({
        where: {
          OR: [{ email: rootEmail }, { phone: rootPhone }],
        },
        select: { id: true },
      })) ??
      (await this.prisma.user.findFirst({
        where: {
          adminRole: {
            isSystem: true,
            name: ROOT_ADMIN_ROLE_NAME,
          },
        },
        select: { id: true },
      }));

    if (!rootUser) {
      throw new Error(
        'ROOT_ADMIN user is missing. Run prisma seed or restore the root admin account before starting the app.',
      );
    }

    await this.prisma.user.update({
      where: {
        id: rootUser.id,
      },
      data: {
        email: rootEmail,
        phone: rootPhone,
        nickname: rootNickname,
        adminRoleId: rootRole.id,
        isActive: true,
        isBanned: false,
        isEmailVerified: true,
        isPhoneVerified: true,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    this.logger.log(
      `ROOT_ADMIN integrity ensured for role ${rootRole.id} and user ${rootUser.id}`,
    );
  }
}
