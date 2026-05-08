import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(requestUserId: string, notificationId: string): Promise<void> {
    const user = await this.userRepository.findById(requestUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isActiveUser()) {
      throw new ForbiddenException('Inactive user');
    }
    await this.userRepository.markNotificationRead(
      notificationId,
      requestUserId,
    );
  }
}
