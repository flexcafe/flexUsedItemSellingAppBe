import { Inject, Injectable } from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { RankConfigResponseDto } from '../../dtos/points/points-summary.dto.js';

@Injectable()
export class ListClientRankConfigUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(): Promise<RankConfigResponseDto[]> {
    const configs = await this.pointsRepository.getRankConfigs();
    return configs.map((row) => new RankConfigResponseDto(row));
  }
}
