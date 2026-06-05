import { jest } from '@jest/globals';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdmin, requireRoomParticipant } from './_helpers.js';
import {
  buildActiveUserMock,
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
      const users = buildUserRepoMock();
      const room = buildChatRoom();
      chats.findRoomById.mockResolvedValue(room);

      await expect(
        requireRoomParticipant(chats, users, ROOM_ID, BUYER_ID),
      ).resolves.toBe(room);
      await expect(
        requireRoomParticipant(chats, users, ROOM_ID, SELLER_ID),
      ).resolves.toBe(room);
    });

    it('throws when room is missing', async () => {
      const chats = buildChatRepoMock();
      const users = buildUserRepoMock();
      chats.findRoomById.mockResolvedValue(null);

      await expect(
        requireRoomParticipant(chats, users, ROOM_ID, BUYER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when user is not a participant', async () => {
      const chats = buildChatRepoMock();
      const users = buildUserRepoMock();
      chats.findRoomById.mockResolvedValue(buildChatRoom());

      await expect(
        requireRoomParticipant(
          chats,
          users,
          ROOM_ID,
          '99999999-9999-9999-9999-999999999999',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when user is banned', async () => {
      const chats = buildChatRepoMock();
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue(
        buildActiveUserMock({ active: false }) as never,
      );

      await expect(
        requireRoomParticipant(chats, users, ROOM_ID, BUYER_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(chats.findRoomById).not.toHaveBeenCalled();
    });
  });

  describe(requireAdmin.name, () => {
    it('passes when user is admin', async () => {
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue({
        isActiveUser: () => true,
        isAdmin: () => true,
      } as never);
      users.getAdminRoleByUserId.mockResolvedValue({
        id: 'role-1',
        name: 'SAFE_PAYMENT_ADMIN',
        isSystem: false,
        permissions: [AdminPermission.MANAGE_SAFE_PAYMENTS],
      });

      await expect(requireAdmin(users, 'admin-1')).resolves.toBeUndefined();
    });

    it('throws when user is not admin', async () => {
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue({
        isActiveUser: () => true,
        isAdmin: () => false,
      } as never);

      await expect(requireAdmin(users, 'u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws when admin is inactive', async () => {
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue({
        isActiveUser: () => false,
        isAdmin: () => true,
      } as never);

      await expect(requireAdmin(users, 'admin-1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when admin lacks safe payment permission', async () => {
      const users = buildUserRepoMock();
      users.findById.mockResolvedValue({
        isActiveUser: () => true,
        isAdmin: () => true,
      } as never);
      users.getAdminRoleByUserId.mockResolvedValue({
        id: 'role-1',
        name: 'REPORT_ADMIN',
        isSystem: false,
        permissions: [AdminPermission.MANAGE_REPORTS],
      });

      await expect(requireAdmin(users, 'admin-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
