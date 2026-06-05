import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller.js';
import { CreateAdminUserUseCase } from '../../../application/use-cases/admin-users/create-admin-user.use-case.js';
import { ListAdminUsersUseCase } from '../../../application/use-cases/admin-users/list-admin-users.use-case.js';
import { UpdateAdminUserRoleUseCase } from '../../../application/use-cases/admin-users/update-admin-user-role.use-case.js';
import { DemoteAdminUserUseCase } from '../../../application/use-cases/admin-users/demote-admin-user.use-case.js';
import { AdminRoleRepository } from '../../../infrastructure/repositories/admin-role.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { ADMIN_ROLE_REPOSITORY } from '../../../domain/repositories/admin-role.repository.interface.js';

@Module({
  controllers: [AdminUsersController],
  providers: [
    CreateAdminUserUseCase,
    ListAdminUsersUseCase,
    UpdateAdminUserRoleUseCase,
    DemoteAdminUserUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: ADMIN_ROLE_REPOSITORY,
      useClass: AdminRoleRepository,
    },
  ],
})
export class AdminUsersModule {}