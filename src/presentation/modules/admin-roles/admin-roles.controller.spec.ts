import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { createHttpTestApp } from '../../../test-utils/http-test-app.js';
import { AdminRolesController } from './admin-roles.controller.js';
import { CreateAdminRoleUseCase } from '../../../application/use-cases/admin-roles/create-admin-role.use-case.js';
import { ListAdminRolesUseCase } from '../../../application/use-cases/admin-roles/list-admin-roles.use-case.js';
import { ListAdminPermissionsUseCase } from '../../../application/use-cases/admin-roles/list-admin-permissions.use-case.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { AdminRoleDto } from '../../../application/dtos/admin-roles/admin-role.dto.js';
import { AdminPermissionListDto } from '../../../application/dtos/admin-roles/admin-permission-list.dto.js';

const ROOT_ADMIN_ID = '11111111-1111-1111-1111-111111111111';

function adminRolesControllerProviders(
  extra: { provide: unknown; useValue: unknown }[] = [],
) {
  return [
    { provide: CreateAdminRoleUseCase, useValue: { execute: jest.fn() } },
    { provide: ListAdminRolesUseCase, useValue: { execute: jest.fn() } },
    {
      provide: ListAdminPermissionsUseCase,
      useValue: { execute: jest.fn() },
    },
    ...extra,
  ];
}

const rootAdminAuthGuard = {
  guard: JwtAuthGuard,
  canActivate: (ctx: unknown) => {
    const req = (ctx as { switchToHttp: () => { getRequest: () => { user?: unknown } } })
      .switchToHttp()
      .getRequest();
    req.user = { sub: ROOT_ADMIN_ID, phone: '+959000000000' };
    return true;
  },
};

describe(AdminRolesController.name, () => {
  it('GET /admin/dashboard/admin-roles returns success envelope', async () => {
    const listAdminRoles = {
      execute: jest.fn().mockResolvedValue([
        new AdminRoleDto({
          id: 'role-root',
          name: 'ROOT_ADMIN',
          description: 'System root',
          isSystem: true,
          permissions: Object.values(AdminPermission),
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        }),
      ]),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminRolesController],
      providers: adminRolesControllerProviders([
        { provide: ListAdminRolesUseCase, useValue: listAdminRoles },
      ]),
      overrideGuards: [rootAdminAuthGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/admin-roles')
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Admin roles retrieved',
        data: expect.any(Array),
      }),
    );
    expect(listAdminRoles.execute).toHaveBeenCalledWith(ROOT_ADMIN_ID);

    await close();
  });

  it('GET /admin/dashboard/admin-roles/permissions returns success envelope', async () => {
    const listAdminPermissions = {
      execute: jest
        .fn()
        .mockResolvedValue(
          new AdminPermissionListDto(Object.values(AdminPermission)),
        ),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminRolesController],
      providers: adminRolesControllerProviders([
        {
          provide: ListAdminPermissionsUseCase,
          useValue: listAdminPermissions,
        },
      ]),
      overrideGuards: [rootAdminAuthGuard],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/admin-roles/permissions')
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Admin permissions retrieved',
        data: expect.objectContaining({
          permissions: expect.arrayContaining([
            AdminPermission.MANAGE_USERS,
          ]),
        }),
      }),
    );
    expect(listAdminPermissions.execute).toHaveBeenCalledWith(ROOT_ADMIN_ID);

    await close();
  });

  it('POST /admin/dashboard/admin-roles validates body (400)', async () => {
    const { app, close } = await createHttpTestApp({
      controllers: [AdminRolesController],
      providers: adminRolesControllerProviders(),
      overrideGuards: [rootAdminAuthGuard],
    });

    await request(app.getHttpServer())
      .post('/api/v1/admin/dashboard/admin-roles')
      .send({})
      .expect(400);

    await close();
  });

  it('POST /admin/dashboard/admin-roles returns created role envelope', async () => {
    const createAdminRole = {
      execute: jest.fn().mockResolvedValue(
        new AdminRoleDto({
          id: 'role-custom',
          name: 'CONTENT_MODERATOR',
          description: 'Moderates content',
          isSystem: false,
          permissions: [
            AdminPermission.MANAGE_REPORTS,
            AdminPermission.MANAGE_SUGGESTIONS,
          ],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        }),
      ),
    };

    const { app, close } = await createHttpTestApp({
      controllers: [AdminRolesController],
      providers: adminRolesControllerProviders([
        { provide: CreateAdminRoleUseCase, useValue: createAdminRole },
      ]),
      overrideGuards: [rootAdminAuthGuard],
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/dashboard/admin-roles')
      .send({
        name: 'CONTENT_MODERATOR',
        description: 'Moderates content',
        permissions: [
          AdminPermission.MANAGE_REPORTS,
          AdminPermission.MANAGE_SUGGESTIONS,
        ],
      })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Admin role created',
        data: expect.objectContaining({
          name: 'CONTENT_MODERATOR',
          isSystem: false,
        }),
      }),
    );
    expect(createAdminRole.execute).toHaveBeenCalledWith(
      ROOT_ADMIN_ID,
      expect.objectContaining({
        name: 'CONTENT_MODERATOR',
        permissions: [
          AdminPermission.MANAGE_REPORTS,
          AdminPermission.MANAGE_SUGGESTIONS,
        ],
      }),
    );

    await close();
  });
});
