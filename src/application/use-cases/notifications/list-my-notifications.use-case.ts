import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { NotificationData } from '../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class ListMyNotificationsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, limit = 20): Promise<NotificationData[]> {
    return this.userRepository.listNotificationsByUserId(userId, limit);
  }
}
