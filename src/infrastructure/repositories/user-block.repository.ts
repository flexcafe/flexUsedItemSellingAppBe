import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  CreateUserBlockData,
  IUserBlockRepository,
  UserBlockData,
} from '../../domain/repositories/user-block.repository.interface.js';

@Injectable()
export class UserBlockRepository implements IUserBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserBlockData): Promise<UserBlockData> {
    const row = await this.prisma.userBlock.create({
      data: {
        blockerId: data.blockerId,
        blockedId: data.blockedId,
        reason: data.reason?.trim() || null,
      },
      include: {
        blocked: { select: { nickname: true, referralCode: true } },
      },
    });
    return this.map(row);
  }

  async delete(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return result.count > 0;
  }

  async listByBlocker(blockerId: string): Promise<UserBlockData[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId },
      include: {
        blocked: { select: { nickname: true, referralCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async listBlockedIds(blockerId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return rows.map((r) => r.blockedId);
  }

  async listExcludedUserIdsForViewer(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.blockerId !== viewerId) ids.add(row.blockerId);
      if (row.blockedId !== viewerId) ids.add(row.blockedId);
    }
    return [...ids];
  }

  async isBlockedEitherWay(userAId: string, userBId: string): Promise<boolean> {
    const row = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
      select: { id: true },
    });
    return !!row;
  }

  async findBlock(
    blockerId: string,
    blockedId: string,
  ): Promise<UserBlockData | null> {
    const row = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      include: {
        blocked: { select: { nickname: true, referralCode: true } },
      },
    });
    return row ? this.map(row) : null;
  }

  private map(row: {
    id: string;
    blockerId: string;
    blockedId: string;
    reason: string | null;
    createdAt: Date;
    blocked: { nickname: string; referralCode: string };
  }): UserBlockData {
    return {
      id: row.id,
      blockerId: row.blockerId,
      blockedId: row.blockedId,
      blockedNickname: row.blocked.nickname,
      blockedReferralCode: row.blocked.referralCode,
      reason: row.reason,
      createdAt: row.createdAt,
    };
  }
}
