import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { TransactionStatsDto } from '../../dtos/points/transaction-stats.dto.js';

@Injectable()
export class GetTransactionStatsUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(userId: string): Promise<TransactionStatsDto> {
    const stats = await this.pointsRepository.getUserTransactionStats(userId);
    if (!stats) {
      throw new NotFoundException('User not found');
    }

    return new TransactionStatsDto(stats);
  }
}
