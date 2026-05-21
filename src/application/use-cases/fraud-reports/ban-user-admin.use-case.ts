import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import type { BanUserDto } from '../../dtos/fraud-reports/review-fraud-report.dto.js';

@Injectable()
export class BanUserAdminUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    userId: string,
    dto: BanUserDto,
  ): Promise<{ userId: string; isBanned: boolean }> {
    await this.assertAdmin(adminId);

    const target = await this.users.findById(userId);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.isAdmin()) {
      throw new ForbiddenException('Cannot ban an admin account');
    }

    await this.users.setUserBanned(userId, true, dto.banReason ?? null);

    await this.users.createNotification({
      userId,
      eventKey: 'ACCOUNT_BANNED_CLIENT',
      metadata: { banReason: dto.banReason ?? null, bannedByAdminId: adminId },
      title: 'Account suspended',
      message:
        dto.banReason?.trim() ??
        'Your account has been suspended by an administrator.',
      referenceId: userId,
    });

    return { userId, isBanned: true };
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.users.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
