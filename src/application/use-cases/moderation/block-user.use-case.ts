import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_BLOCK_REPOSITORY,
  type IUserBlockRepository,
} from '../../../domain/repositories/user-block.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import type { BlockUserDto } from '../../dtos/moderation/moderation.dto.js';
import { UserBlockDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class BlockUserUseCase {
  constructor(
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly blocks: IUserBlockRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(blockerId: string, dto: BlockUserDto): Promise<UserBlockDto> {
    if (blockerId === dto.blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const blocked = await this.users.findById(dto.blockedUserId);
    if (!blocked) {
      throw new NotFoundException('User not found');
    }
    if (blocked.adminRoleId) {
      throw new BadRequestException('Cannot block an admin account');
    }

    const existing = await this.blocks.findBlock(blockerId, dto.blockedUserId);
    if (existing) {
      throw new ConflictException('User is already blocked');
    }

    const row = await this.blocks.create({
      blockerId,
      blockedId: dto.blockedUserId,
      reason: dto.reason,
    });

    const blocker = await this.users.findById(blockerId);
    const adminIds = await this.users.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.users.createNotification({
          userId: adminId,
          eventKey: 'USER_BLOCK_CREATED_ADMIN',
          metadata: {
            blockId: row.id,
            blockerId,
            blockedId: row.blockedId,
            reason: row.reason,
          },
          title: 'User blocked',
          message: `${blocker?.nickname ?? 'A user'} blocked ${row.blockedNickname}. Review for abusive behavior.`,
          referenceId: row.id,
        }),
      ),
    );

    return new UserBlockDto(row);
  }
}
