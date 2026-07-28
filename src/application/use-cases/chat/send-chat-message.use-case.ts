import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type ChatMessageData,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  MessageType,
  isClientSendableMessageType,
} from '../../../domain/enums/message-type.enum.js';
import {
  CHAT_IDEMPOTENCY_STORE,
  type IChatIdempotencyStore,
} from '../../../domain/services/chat-idempotency.interface.js';
import {
  CHAT_MESSAGE_PUBLISHER,
  type IChatMessagePublisher,
} from '../../../domain/services/chat-message-publisher.interface.js';
import { requireRoomParticipant } from './_helpers.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  USER_BLOCK_REPOSITORY,
  type IUserBlockRepository,
} from '../../../domain/repositories/user-block.repository.interface.js';
import { ContentFilterService } from '../../services/content-filter.service.js';

@Injectable()
export class SendChatMessageUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly userBlocks: IUserBlockRepository,
    @Inject(CHAT_IDEMPOTENCY_STORE)
    private readonly idempotency: IChatIdempotencyStore,
    @Inject(CHAT_MESSAGE_PUBLISHER)
    private readonly publisher: IChatMessagePublisher,
    private readonly contentFilter: ContentFilterService,
  ) {}

  async execute(
    userId: string,
    chatRoomId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    idempotencyKey?: string,
  ): Promise<ChatMessageData> {
    const room = await requireRoomParticipant(
      this.chats,
      this.users,
      chatRoomId,
      userId,
    );

    const otherUserId = room.buyerId === userId ? room.sellerId : room.buyerId;
    if (await this.userBlocks.isBlockedEitherWay(userId, otherUserId)) {
      throw new ForbiddenException(
        'Messaging is unavailable because one of you has blocked the other',
      );
    }

    const messageType = type ?? MessageType.TEXT;
    if (!isClientSendableMessageType(messageType)) {
      throw new BadRequestException(
        'Only TEXT and IMAGE messages can be sent by clients',
      );
    }

    if (messageType === MessageType.TEXT) {
      await this.contentFilter.assertClean(content);
    }

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
      type: messageType,
    });
    this.publisher.publish(room.id, room.buyerId, room.sellerId, message);
    return message;
  }
}
