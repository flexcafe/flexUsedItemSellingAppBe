import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ADMIN_ROLE_REPOSITORY,
  type IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import type { CreateAdminRoleDto } from '../../dtos/admin-roles/create-admin-role.dto.js';
import { AdminRoleDto } from '../../dtos/admin-roles/admin-role.dto.js';
import { assertRootAdmin } from './_helpers.js';

@Injectable()
export class CreateAdminRoleUseCase {
  constructor(
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly roles: IAdminRoleRepository,
  ) {}

  async execute(
    rootAdminId: string,
    dto: CreateAdminRoleDto,
  ): Promise<AdminRoleDto> {
    await assertRootAdmin(this.roles, rootAdminId);

    const normalizedName = dto.name.trim().toUpperCase();
    if (normalizedName === 'ROOT_ADMIN') {
      throw new BadRequestException('ROOT_ADMIN role is system-managed');
    }

    const existing = await this.roles.findByName(normalizedName);
    if (existing) {
      throw new ConflictException('Admin role name already exists');
    }

    const created = await this.roles.create({
      name: normalizedName,
      description: dto.description?.trim() || undefined,
      permissions: dto.permissions,
    });
    return new AdminRoleDto(created);
  }
}
