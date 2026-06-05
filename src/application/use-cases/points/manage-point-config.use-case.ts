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
  RankConfigResponseDto,
  StarPointConfigDto,
  UpdateRankConfigsDto,
  UpdateStarPointConfigsDto,
} from '../../dtos/points/point-config.dto.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

@Injectable()
export class ManagePointConfigUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async listStarConfigs(adminId: string): Promise<StarPointConfigDto[]> {
    await this.assertAdmin(adminId, AdminPermission.MANAGE_POINT_CONFIG);
    const configs = await this.pointsRepository.getStarPointConfigs();
    return configs.map((config) => new StarPointConfigDto(config));
  }

  async updateStarConfigs(
    adminId: string,
    dto: UpdateStarPointConfigsDto,
  ): Promise<StarPointConfigDto[]> {
    await this.assertAdmin(adminId, AdminPermission.MANAGE_POINT_CONFIG);
    const configs = await this.pointsRepository.upsertStarPointConfigs(
      dto.configs.map((config) => ({
        starCount: config.starCount,
        pointsAwarded: config.pointsAwarded,
      })),
    );

    return configs.map((config) => new StarPointConfigDto(config));
  }

  async listRankConfigs(adminId: string): Promise<RankConfigResponseDto[]> {
    await this.assertAdmin(adminId, AdminPermission.MANAGE_RANK_CONFIG);
    const configs = await this.pointsRepository.getRankConfigs();
    return configs.map((config) => new RankConfigResponseDto(config));
  }

  async updateRankConfigs(
    adminId: string,
    dto: UpdateRankConfigsDto,
  ): Promise<RankConfigResponseDto[]> {
    await this.assertAdmin(adminId, AdminPermission.MANAGE_RANK_CONFIG);
    const configs = await this.pointsRepository.upsertRankConfigs(
      dto.configs.map((config) => ({
        tier: config.tier,
        minPoints: config.minPoints,
        maxPoints: config.maxPoints ?? null,
        label: config.label,
        badgeUrl: config.badgeUrl ?? null,
        sortOrder: config.sortOrder,
      })),
    );

    return configs.map((config) => new RankConfigResponseDto(config));
  }

  private async assertAdmin(
    adminId: string,
    permission: AdminPermission,
  ): Promise<void> {
    await requireAdminPermission(this.userRepository, adminId, permission);
  }
}
