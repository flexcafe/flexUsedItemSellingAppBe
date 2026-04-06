import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { UserProfileDto } from '../../dtos/auth/auth-response.dto.js';

@Injectable()
export class GetCurrentUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserProfileDto> {
    const authData = await this.userRepository.getAuthDataByUserId(userId);
    if (!authData) {
      throw new NotFoundException('User not found');
    }

    return new UserProfileDto(authData);
  }
}
