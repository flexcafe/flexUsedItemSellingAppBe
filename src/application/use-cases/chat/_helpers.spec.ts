import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { requireAdmin, requireRoomParticipant } from './_helpers.js';
import {
  buildChatRepoMock,
  buildChatRoom,
  buildUserRepoMock,
  BUYER_ID,
  ROOM_ID,
  SELLER_ID,
} from './_chat-test-mocks.js';

describe('chat _helpers', () => {
  describe(requireRoomParticipant.name, () => {
    it('returns room when user is buyer or seller', async () => {
      const chats = buildChatRepoMock();
      const room = buildChatRoom();
      chats.findRoomById.mockResolvedValue(room);

      await expect(
        requireRoomParticipant(chats, ROOM_ID, BUYER_ID),
      ).resolves.toBe(room);
      await expect(
        requireRoomParticipant(chats, ROOM_ID, SELLER_ID),
      ).resolves.toBe(room);
    });

    it('throws when room is missing', async () => {
      const chats = buildChatRepoMock();
      chats.findRoomById.mockResolvedValue(null);

      await expect(
        requireRoomParticipant(chats, ROOM_ID, BUYER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when user is not a participant', async () => {
      const chats = buildChatRepoMock();
      chats.findRoomById.mockResolvedValue(buildChatRoom());

      await expect(
        requireRoomParticipant(chats, ROOM_ID, '99999999-9999-9999-9999-999999999999'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe(requireAdmin.name, () => {
    it('passes when user is admin', async () => {
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue({ isAdmin: () => true } as never);

      await expect(requireAdmin(users, 'admin-1')).resolves.toBeUndefined();
    });

    it('throws when user is not admin', async () => {
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue({ isAdmin: () => false } as never);

      await expect(requireAdmin(users, 'u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
