import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PublicUserProfileDto } from '../../dtos/points/public-user-profile.dto.js';

@Injectable()
export class GetPublicUserProfileUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(userId: string): Promise<PublicUserProfileDto> {
    const profile = await this.pointsRepository.getPublicUserProfile(userId);
    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return new PublicUserProfileDto(profile);
  }
}
