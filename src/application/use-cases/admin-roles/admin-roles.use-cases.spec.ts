import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import type {
  AdminRoleData,
  IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import { CreateAdminRoleUseCase } from './create-admin-role.use-case.js';
import { ListAdminRolesUseCase } from './list-admin-roles.use-case.js';
import { ListAdminPermissionsUseCase } from './list-admin-permissions.use-case.js';

function buildRole(overrides: Partial<AdminRoleData> = {}): AdminRoleData {
  return {
    id: 'role-1',
    name: 'CONTENT_MODERATOR',
    description: 'Moderates reports and suggestions',
    isSystem: false,
    permissions: [
      AdminPermission.MANAGE_REPORTS,
      AdminPermission.MANAGE_SUGGESTIONS,
    ],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildRepoMock(): jest.Mocked<IAdminRoleRepository> {
  return {
    isRootAdminUser: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    listAll: jest.fn(),
  };
}

describe(CreateAdminRoleUseCase.name, () => {
  it('creates role for root admin', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(true);
    repo.findByName.mockResolvedValue(null);
    repo.create.mockResolvedValue(buildRole());

    const useCase = new CreateAdminRoleUseCase(repo);
    const result = await useCase.execute('root-user', {
      name: 'content_moderator',
      description: 'Moderates reports and suggestions',
      permissions: [AdminPermission.MANAGE_REPORTS],
    });

    expect(result.name).toBe('CONTENT_MODERATOR');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CONTENT_MODERATOR',
      }),
    );
  });

  it('rejects non-root user', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(false);
    const useCase = new CreateAdminRoleUseCase(repo);

    await expect(
      useCase.execute('normal-admin', {
        name: 'OPS',
        permissions: [AdminPermission.VIEW_ANALYTICS],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects ROOT_ADMIN role creation', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(true);
    const useCase = new CreateAdminRoleUseCase(repo);

    await expect(
      useCase.execute('root-user', {
        name: 'ROOT_ADMIN',
        permissions: [AdminPermission.MANAGE_USERS],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate role name', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(true);
    repo.findByName.mockResolvedValue(buildRole());
    const useCase = new CreateAdminRoleUseCase(repo);

    await expect(
      useCase.execute('root-user', {
        name: 'content_moderator',
        permissions: [AdminPermission.MANAGE_REPORTS],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe(ListAdminRolesUseCase.name, () => {
  it('lists roles for root admin', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(true);
    repo.listAll.mockResolvedValue([
      buildRole({
        name: 'ROOT_ADMIN',
        isSystem: true,
      }),
      buildRole(),
    ]);

    const useCase = new ListAdminRolesUseCase(repo);
    const rows = await useCase.execute('root-user');

    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe('ROOT_ADMIN');
  });

  it('blocks non-root admin', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(false);
    const useCase = new ListAdminRolesUseCase(repo);

    await expect(useCase.execute('normal-admin')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe(ListAdminPermissionsUseCase.name, () => {
  it('returns enum values for root admin', async () => {
    const repo = buildRepoMock();
    repo.isRootAdminUser.mockResolvedValue(true);
    const useCase = new ListAdminPermissionsUseCase(repo);

    const result = await useCase.execute('root-user');

    expect(result.permissions).toContain(AdminPermission.MANAGE_USERS);
    expect(result.permissions).toContain(AdminPermission.SEND_NOTIFICATIONS);
  });
});
