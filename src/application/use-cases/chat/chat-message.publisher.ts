import { Injectable, Logger } from '@nestjs/common';
import type { ChatMessageData } from '../../../domain/repositories/chat.repository.interface.js';
import { PusherService } from '../../../infrastructure/realtime/pusher.service.js';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';

@Injectable()
export class ChatMessagePublisher {
  private readonly logger = new Logger(ChatMessagePublisher.name);

  constructor(
    private readonly pusher: PusherService,
    private readonly realtime: ChatRealtimeService,
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
