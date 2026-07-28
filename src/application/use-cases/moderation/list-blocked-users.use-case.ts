import { Inject, Injectable } from '@nestjs/common';
import {
  USER_BLOCK_REPOSITORY,
  type IUserBlockRepository,
} from '../../../domain/repositories/user-block.repository.interface.js';
import { UserBlockDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class ListBlockedUsersUseCase {
  constructor(
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly blocks: IUserBlockRepository,
  ) {}

  async execute(blockerId: string): Promise<UserBlockDto[]> {
    const rows = await this.blocks.listByBlocker(blockerId);
    return rows.map((r) => new UserBlockDto(r));
  }
}
