import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { IChatRealtime } from '../../domain/services/chat-realtime.interface.js';

@Injectable()
export class ChatRealtimeService implements IChatRealtime {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('Socket.IO server bound to ChatRealtimeService');
  }

  emitToChatRoom(chatRoomId: string, event: string, payload: unknown): void {
    this.server?.to(`chat:${chatRoomId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
