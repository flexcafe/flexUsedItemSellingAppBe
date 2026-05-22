import { Module } from '@nestjs/common';
import { AdminRolesController } from './admin-roles.controller.js';
import { CreateAdminRoleUseCase } from '../../../application/use-cases/admin-roles/create-admin-role.use-case.js';
import { ListAdminRolesUseCase } from '../../../application/use-cases/admin-roles/list-admin-roles.use-case.js';
import { ListAdminPermissionsUseCase } from '../../../application/use-cases/admin-roles/list-admin-permissions.use-case.js';
import { ADMIN_ROLE_REPOSITORY } from '../../../domain/repositories/admin-role.repository.interface.js';
import { AdminRoleRepository } from '../../../infrastructure/repositories/admin-role.repository.js';

@Module({
  controllers: [AdminRolesController],
  providers: [
    CreateAdminRoleUseCase,
    ListAdminRolesUseCase,
    ListAdminPermissionsUseCase,
    {
      provide: ADMIN_ROLE_REPOSITORY,
      useClass: AdminRoleRepository,
    },
  ],
})
export class AdminRolesModule {}
