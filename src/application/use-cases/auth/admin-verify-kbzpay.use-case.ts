import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { AdminVerifyKbzPayDto } from '../../dtos/auth/admin-verify-kbzpay.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class AdminVerifyKbzPayUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminUserId: string,
    targetUserId: string,
    dto: AdminVerifyKbzPayDto,
  ): Promise<VerificationActionResultDto> {
    const adminUser = await this.userRepository.findById(adminUserId);
    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    if (!adminUser.isAdmin()) {
      throw new ForbiddenException('Only admins can verify KBZPay');
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    await this.userRepository.markKbzPayVerified(
      targetUserId,
      adminUserId,
      dto.adminNote,
    );

    await this.userRepository.createNotification({
      userId: targetUserId,
      title: 'KBZPay Verified',
      message: `Your KBZPay verification is approved by admin.${dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : ''}`,
      referenceId: targetUserId,
    });

    return new VerificationActionResultDto('KBZPAY_VERIFIED');
  }
}
