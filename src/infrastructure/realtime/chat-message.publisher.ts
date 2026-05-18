import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChatMessageData } from '../../domain/repositories/chat.repository.interface.js';
import {
  CHAT_REALTIME,
  type IChatRealtime,
} from '../../domain/services/chat-realtime.interface.js';
import type { IChatMessagePublisher } from '../../domain/services/chat-message-publisher.interface.js';
import { PusherService } from './pusher.service.js';

@Injectable()
export class ChatMessagePublisherService implements IChatMessagePublisher {
  private readonly logger = new Logger(ChatMessagePublisherService.name);

  constructor(
    @Inject(CHAT_REALTIME)
    private readonly realtime: IChatRealtime,
    private readonly pusher: PusherService,
  ) {}

  publish(
    chatRoomId: string,
    buyerId: string,
    sellerId: string,
    message: ChatMessageData,
    event = 'chat.message.sent',
  ): void {
    this.realtime.emitToChatRoom(chatRoomId, event, {
      chatRoomId,
      message,
    });
    this.realtime.emitToUser(buyerId, 'chat.room.updated', {
      chatRoomId,
      messageId: message.id,
    });
    this.realtime.emitToUser(sellerId, 'chat.room.updated', {
      chatRoomId,
      messageId: message.id,
    });
    if (event === 'chat.message.sent') {
      return;
    }

    void Promise.allSettled([
      this.pusher.trigger(`private-user-${buyerId}`, 'chat.room.updated', {
        chatRoomId,
        messageId: message.id,
      }),
      this.pusher.trigger(`private-user-${sellerId}`, 'chat.room.updated', {
        chatRoomId,
        messageId: message.id,
      }),
    ]).then((results) => {
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          const target = idx === 0 ? buyerId : sellerId;
          this.logger.warn(
            `Pusher chat.room.updated failed for user=${target}: ${String(result.reason)}`,
          );
        }
      });
    });
  }
}
