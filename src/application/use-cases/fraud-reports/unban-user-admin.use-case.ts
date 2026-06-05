import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class UnbanUserAdminUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    userId: string,
  ): Promise<{ userId: string; isBanned: boolean }> {
    await requireAdminPermission(
      this.users,
      adminId,
      AdminPermission.MANAGE_USERS,
    );

    const target = await this.users.findById(userId);
    if (!target) {
      throw new NotFoundException('User not found');
    }

    await this.users.setUserBanned(userId, false);

    await this.users.createNotification({
      userId,
      eventKey: 'ACCOUNT_UNBANNED_CLIENT',
      metadata: { unbannedByAdminId: adminId },
      title: 'Account reinstated',
      message:
        'Your account suspension has been lifted. You can sign in and use the app again.',
      referenceId: userId,
    });

    return { userId, isBanned: false };
  }
}
