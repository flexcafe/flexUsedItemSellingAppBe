import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PointSourceType } from '../../../domain/enums/point-source-type.enum.js';
import { AdminVerifyKbzPayDto } from '../../dtos/auth/admin-verify-kbzpay.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class AdminVerifyKbzPayUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(
    adminUserId: string,
    targetUserId: string,
    dto: AdminVerifyKbzPayDto,
  ): Promise<VerificationActionResultDto> {
    await requireAdminPermission(
      this.userRepository,
      adminUserId,
      AdminPermission.MANAGE_USERS,
    );

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    await this.userRepository.markKbzPayVerified(
      targetUserId,
      adminUserId,
      dto.adminNote,
    );

    await this.pointsRepository.grantAccountLifetimeMilestoneBonus(
      targetUserId,
      PointSourceType.KBZPAY_VERIFIED_BONUS,
    );

    await this.userRepository.createNotification({
      userId: targetUserId,
      eventKey: 'KBZPAY_VERIFIED_CLIENT',
      metadata: {
        adminNote: dto.adminNote ?? null,
      },
      title: 'KBZPay Verified',
      message: `Your KBZPay verification is approved by admin.${dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : ''}`,
      referenceId: targetUserId,
    });

    return new VerificationActionResultDto('KBZPAY_VERIFIED');
  }
}
