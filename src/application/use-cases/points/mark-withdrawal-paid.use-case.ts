import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import {
  MarkWithdrawalPaidDto,
  WithdrawalRequestDto,
} from '../../dtos/points/withdrawal.dto.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class MarkWithdrawalPaidUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    withdrawalId: string,
    dto: MarkWithdrawalPaidDto,
  ): Promise<WithdrawalRequestDto> {
    await requireAdminPermission(
      this.userRepository,
      adminId,
      AdminPermission.MANAGE_WITHDRAWALS,
    );

    const row = await this.pointsRepository.markWithdrawalPaid({
      withdrawalId,
      adminId,
      kbzTransferRef: dto.kbzTransferRef,
      adminNote: dto.adminNote,
    });

    return new WithdrawalRequestDto(row);
  }
}
