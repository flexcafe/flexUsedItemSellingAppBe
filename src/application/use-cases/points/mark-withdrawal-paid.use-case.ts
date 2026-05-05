import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
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
    const admin = await this.userRepository.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admin users can perform this action');
    }

    const row = await this.pointsRepository.markWithdrawalPaid({
      withdrawalId,
      adminId,
      kbzTransferRef: dto.kbzTransferRef,
      adminNote: dto.adminNote,
    });

    return new WithdrawalRequestDto(row);
  }
}
