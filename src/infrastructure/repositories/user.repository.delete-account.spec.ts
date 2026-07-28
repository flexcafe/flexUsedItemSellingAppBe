import { jest } from '@jest/globals';
import { UserRepository } from './user.repository.js';

function buildPrismaMock() {
  const tx = {
    listing: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    chatRoom: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    locationShare: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    userBlock: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    notification: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    userProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    kbzPayAccount: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    user: { update: jest.fn().mockResolvedValue({}) },
  };

  return {
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (ctx: typeof tx) => unknown) => cb(tx)),
    tx,
  };
}

describe(`${UserRepository.name}.deleteAccount`, () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('no-ops when user is missing', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const repo = new UserRepository(prisma as never, {} as never);

    await repo.deleteAccount(userId);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('no-ops when user is already deleted', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      authTokenVersion: 2,
      deletedAt: new Date(),
    });
    const repo = new UserRepository(prisma as never, {} as never);

    await repo.deleteAccount(userId);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('anonymizes PII, soft-deletes listings, closes chats, and bumps token version', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      authTokenVersion: 5,
      deletedAt: null,
    });
    const repo = new UserRepository(prisma as never, {} as never);

    await repo.deleteAccount(userId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(prisma.tx.listing.updateMany).toHaveBeenCalledWith({
      where: { sellerId: userId, isDeleted: false },
      data: {
        isDeleted: true,
        status: 'ARCHIVED',
      },
    });

    expect(prisma.tx.chatRoom.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        isActive: true,
      },
      data: { isActive: false },
    });

    expect(prisma.tx.locationShare.updateMany).toHaveBeenCalledWith({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    expect(prisma.tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(prisma.tx.userBlock.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    expect(prisma.tx.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });

    expect(prisma.tx.userProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: expect.objectContaining({
          avatar: null,
          bio: null,
          facebookName: null,
          facebookProfileUrl: null,
        }),
      }),
    );

    expect(prisma.tx.kbzPayAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: expect.objectContaining({
          accountName: 'Deleted User',
          phoneNumber: `deleted:${userId}`,
          isVerified: false,
        }),
      }),
    );

    expect(prisma.tx.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: expect.objectContaining({
        phone: `deleted:${userId}`,
        email: null,
        facebookId: null,
        nickname: 'Deleted User',
        isActive: false,
        authTokenVersion: 6,
        referralCode: `DEL${userId.replace(/-/g, '').slice(0, 13)}`,
        deletedAt: expect.any(Date),
      }),
    });
  });
});
