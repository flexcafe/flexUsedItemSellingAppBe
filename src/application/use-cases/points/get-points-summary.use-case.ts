import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PointsSummaryDto } from '../../dtos/points/points-summary.dto.js';

@Injectable()
export class GetPointsSummaryUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(userId: string): Promise<PointsSummaryDto> {
    const summary = await this.pointsRepository.getUserPointsSummary(userId);
    if (!summary) {
      throw new NotFoundException('User not found');
    }

    return new PointsSummaryDto(summary);
  }
}
