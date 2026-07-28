import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { DeleteAccountDto } from '../../dtos/profile/delete-account.dto.js';
import { DeleteAccountResultDto } from '../../dtos/profile/delete-account.dto.js';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: DeleteAccountDto,
  ): Promise<DeleteAccountResultDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isAdmin()) {
      throw new ForbiddenException(
        'Admin accounts cannot be deleted from the client app',
      );
    }
    if (user.isDeleted()) {
      throw new ConflictException('Account is already deleted');
    }

    const passwordOk = await compare(dto.currentPassword, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.userRepository.deleteAccount(userId);
    return new DeleteAccountResultDto(new Date());
  }
}
