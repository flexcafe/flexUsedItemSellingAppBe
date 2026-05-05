import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
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
    const admin = await this.userRepository.findById(adminId);
    if (!admin?.isAdmin()) {
      throw new ForbiddenException('Only admin users can perform this action');
    }

    const rows = await this.pointsRepository.findWithdrawalRequests(status);
    return rows.map((row) => new WithdrawalRequestDto(row));
  }
}
