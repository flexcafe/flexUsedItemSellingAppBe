import { Inject, Injectable } from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { WithdrawalRequestDto } from '../../dtos/points/withdrawal.dto.js';

@Injectable()
export class ListMyWithdrawalsUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(userId: string): Promise<WithdrawalRequestDto[]> {
    const rows = await this.pointsRepository.findUserWithdrawalRequests(userId);
    return rows.map((row) => new WithdrawalRequestDto(row));
  }
}
