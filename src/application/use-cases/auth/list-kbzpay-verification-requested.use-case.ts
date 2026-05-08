import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class ListKbzPayVerificationRequestedUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(adminUserId: string) {
    const adminUser = await this.userRepository.findById(adminUserId);
    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }
    if (!adminUser.isAdmin()) {
      throw new ForbiddenException(
        'Only admins can list KBZPay verification requests',
      );
    }
    return this.userRepository.findKbzPayVerificationRequested();
  }
}
