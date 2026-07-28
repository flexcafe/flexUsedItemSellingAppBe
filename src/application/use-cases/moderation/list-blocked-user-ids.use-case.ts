import { Inject, Injectable } from '@nestjs/common';
import {
  USER_BLOCK_REPOSITORY,
  type IUserBlockRepository,
} from '../../../domain/repositories/user-block.repository.interface.js';

@Injectable()
export class ListBlockedUserIdsUseCase {
  constructor(
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly blocks: IUserBlockRepository,
  ) {}

  async execute(viewerId: string): Promise<string[]> {
    return this.blocks.listExcludedUserIdsForViewer(viewerId);
  }
}
