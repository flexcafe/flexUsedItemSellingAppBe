import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FACEBOOK_REPOSITORY,
  type IFacebookRepository,
} from '../../../domain/repositories/facebook.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { LinkFacebookDto } from '../../dtos/profile/link-facebook.dto.js';

@Injectable()
export class LinkFacebookUseCase {
  constructor(
    @Inject(FACEBOOK_REPOSITORY)
    private readonly facebookRepository: IFacebookRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, dto: LinkFacebookDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const owner = await this.userRepository.findByFacebookId(dto.facebookId);
    if (owner && owner.id !== userId) {
      throw new ConflictException(
        'This Facebook account is already linked to another user',
      );
    }

    await this.facebookRepository.setFacebookLink({
      userId,
      facebookId: dto.facebookId,
      facebookName: dto.facebookName,
      facebookProfileUrl: dto.facebookProfileUrl,
    });

    await this.userRepository.createNotification({
      userId,
      eventKey: 'FACEBOOK_LINKED_CLIENT',
      metadata: {
        facebookId: dto.facebookId,
        facebookName: dto.facebookName,
        facebookProfileUrl: dto.facebookProfileUrl,
      },
      title: 'Facebook linked',
      message: 'Your Facebook account was linked successfully.',
      referenceId: userId,
    });
  }
}
