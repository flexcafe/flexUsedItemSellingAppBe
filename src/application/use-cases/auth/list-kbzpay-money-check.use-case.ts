import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class ListKbzPayMoneyCheckUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(adminUserId: string) {
    await requireAdminPermission(
      this.userRepository,
      adminUserId,
      AdminPermission.MANAGE_USERS,
    );
    return this.userRepository.findKbzPayMoneyCheckList();
  }
}
