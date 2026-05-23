import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type SafePaymentStatusData,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class GetChatSafePaymentStatusUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
  ): Promise<SafePaymentStatusData> {
    const room = await requireRoomParticipant(
      this.chats,
      this.users,
      chatRoomId,
      userId,
    );
    const status = await this.chats.findSafePaymentStatusByChatRoom(room.id);
    if (!status) {
      throw new NotFoundException('No safe payment in progress for this chat');
    }

    let buyerKbzAccount: SafePaymentStatusData['buyerKbzAccount'] = null;
    if (userId === status.transaction.buyerId) {
      const auth = await this.users.getAuthDataByUserId(
        status.transaction.buyerId,
      );
      if (auth?.kbzPayAccount) {
        buyerKbzAccount = {
          accountName: auth.kbzPayAccount.accountName,
          phoneNumber: auth.kbzPayAccount.phoneNumber,
          isVerified: auth.kbzPayAccount.isVerified,
        };
      }
    }

    return { ...status, buyerKbzAccount };
  }
}
