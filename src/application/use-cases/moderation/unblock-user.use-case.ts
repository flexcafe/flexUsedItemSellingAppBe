import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_BLOCK_REPOSITORY,
  type IUserBlockRepository,
} from '../../../domain/repositories/user-block.repository.interface.js';

@Injectable()
export class UnblockUserUseCase {
  constructor(
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly blocks: IUserBlockRepository,
  ) {}

  async execute(
    blockerId: string,
    blockedUserId: string,
  ): Promise<{ blockedUserId: string; unblocked: boolean }> {
    const removed = await this.blocks.delete(blockerId, blockedUserId);
    if (!removed) {
      throw new NotFoundException('Block not found');
    }
    return { blockedUserId, unblocked: true };
  }
}
