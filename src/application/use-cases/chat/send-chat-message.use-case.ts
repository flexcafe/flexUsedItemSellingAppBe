import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type ChatMessageData,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { ChatIdempotencyService } from '../../../infrastructure/realtime/chat-idempotency.service.js';
import { requireRoomParticipant } from './_helpers.js';
import { ChatMessagePublisher } from './chat-message.publisher.js';

@Injectable()
export class SendChatMessageUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    private readonly idempotency: ChatIdempotencyService,
    private readonly publisher: ChatMessagePublisher,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    idempotencyKey?: string,
  ): Promise<ChatMessageData> {
    const room = await requireRoomParticipant(this.chats, chatRoomId, userId);
    if (idempotencyKey) {
      const allowed = await this.idempotency.reserve(
        `chat:message:${room.id}:${userId}:${idempotencyKey}`,
        180,
      );
      if (!allowed) {
        throw new ConflictException('Duplicate message request');
      }
    }

    const message = await this.chats.createMessage({
      chatRoomId: room.id,
      senderId: userId,
      content,
      type,
    });
    this.publisher.publish(room.id, room.buyerId, room.sellerId, message);
    return message;
  }
}
