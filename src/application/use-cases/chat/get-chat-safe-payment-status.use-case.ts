import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
  type SafePaymentStatusData,
} from '../../../domain/repositories/chat.repository.interface.js';
import { requireRoomParticipant } from './_helpers.js';

@Injectable()
export class GetChatSafePaymentStatusUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
  ): Promise<SafePaymentStatusData> {
    await requireRoomParticipant(this.chats, chatRoomId, userId);
    const status = await this.chats.findSafePaymentStatusByChatRoom(chatRoomId);
    if (!status) {
      throw new NotFoundException('No safe payment in progress for this chat');
    }
    return status;
  }
}
