export interface UserBlockData {
  id: string;
  blockerId: string;
  blockedId: string;
  blockedNickname: string;
  blockedReferralCode: string;
  reason: string | null;
  createdAt: Date;
}

export interface CreateUserBlockData {
  blockerId: string;
  blockedId: string;
  reason?: string;
}

export interface IUserBlockRepository {
  create(data: CreateUserBlockData): Promise<UserBlockData>;
  delete(blockerId: string, blockedId: string): Promise<boolean>;
  listByBlocker(blockerId: string): Promise<UserBlockData[]>;
  listBlockedIds(blockerId: string): Promise<string[]>;
  /** User IDs this viewer should hide (people they blocked OR who blocked them). */
  listExcludedUserIdsForViewer(viewerId: string): Promise<string[]>;
  isBlockedEitherWay(userAId: string, userBId: string): Promise<boolean>;
  findBlock(blockerId: string, blockedId: string): Promise<UserBlockData | null>;
}

export const USER_BLOCK_REPOSITORY = Symbol('USER_BLOCK_REPOSITORY');
