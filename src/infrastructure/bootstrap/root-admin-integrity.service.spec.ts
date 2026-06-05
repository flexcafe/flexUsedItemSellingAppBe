import { jest } from '@jest/globals';
import { RootAdminIntegrityService } from './root-admin-integrity.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';

describe(RootAdminIntegrityService.name, () => {
  function buildPrismaMock() {
    return {
      adminRole: {
        upsert: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
  }

  function buildConfigMock() {
    return {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          ROOT_ADMIN_EMAIL: 'admin@example.com',
          ROOT_ADMIN_PHONE: '+959000000000',
          ROOT_ADMIN_NICKNAME: 'Root Admin',
        };
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;
  }

  it('repairs root role and rebinds the root admin user', async () => {
    const prisma = buildPrismaMock();
    const config = buildConfigMock();

    prisma.adminRole.upsert.mockResolvedValue({
      id: 'role-root',
      name: 'ROOT_ADMIN',
      permissions: [],
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-root' });
    prisma.user.update.mockResolvedValue({ id: 'user-root' });

    const service = new RootAdminIntegrityService(prisma, config);
    await service.onApplicationBootstrap();

    expect(prisma.adminRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'ROOT_ADMIN' },
        create: expect.objectContaining({
          name: 'ROOT_ADMIN',
          isSystem: true,
        }),
        update: expect.objectContaining({
          isSystem: true,
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-root' },
      data: expect.objectContaining({
        email: 'admin@example.com',
        phone: '+959000000000',
        nickname: 'Root Admin',
        adminRoleId: 'role-root',
        isActive: true,
        isBanned: false,
        isEmailVerified: true,
        isPhoneVerified: true,
      }),
    });
  });

  it('fails fast when the root admin user is missing', async () => {
    const prisma = buildPrismaMock();
    const config = buildConfigMock();

    prisma.adminRole.upsert.mockResolvedValue({
      id: 'role-root',
      name: 'ROOT_ADMIN',
      permissions: [],
    });
    prisma.user.findFirst.mockResolvedValue(null);

    const service = new RootAdminIntegrityService(prisma, config);

    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      'ROOT_ADMIN user is missing',
    );
  });
});
