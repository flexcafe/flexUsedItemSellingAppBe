import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { WithdrawalStatus } from '../../../domain/enums/withdrawal-status.enum.js';
import { WithdrawalRequestDto } from '../../dtos/points/withdrawal.dto.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class ListWithdrawalsUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminId: string,
    status?: WithdrawalStatus,
  ): Promise<WithdrawalRequestDto[]> {
    await requireAdminPermission(
      this.userRepository,
      adminId,
      AdminPermission.MANAGE_WITHDRAWALS,
    );

    const rows = await this.pointsRepository.findWithdrawalRequests(status);
    return rows.map((row) => new WithdrawalRequestDto(row));
  }
}
