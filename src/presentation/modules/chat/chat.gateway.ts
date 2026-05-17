import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ForbiddenException,
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket, Server } from 'socket.io';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { ChatService } from '../../../application/use-cases/chat/chat.service.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import {
  SendChatMessageDto,
  UpdateLocationShareDto,
} from '../../../application/dtos/chat/chat.dto.js';

type SocketUser = {
  sub: string;
  phone?: string;
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);
  private activeConnections = 0;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtime: ChatRealtimeService,
    private readonly chats: ChatService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<SocketUser>(token);
      client.data.user = payload;
      client.join(`user:${payload.sub}`);
      this.activeConnections += 1;
      this.logger.debug(`chat.gateway.connections=${this.activeConnections}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const hasUser = Boolean((client.data.user as SocketUser | undefined)?.sub);
    if (hasUser && this.activeConnections > 0) {
      this.activeConnections -= 1;
    }
    this.logger.debug(`chat.gateway.connections=${this.activeConnections}`);
  }

  @SubscribeMessage('chat.join')
  async onJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    const page = await this.chats.listMessages(userId, body.chatRoomId, null, 1);
    if (page.items.length === 0 && !page.nextCursor) {
      await this.chats.listRooms(userId, null, 1);
    }
    client.join(`chat:${body.chatRoomId}`);
    return { ok: true, chatRoomId: body.chatRoomId };
  }

  @SubscribeMessage('chat.leave')
  onLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatRoomId: string },
  ) {
    client.leave(`chat:${body.chatRoomId}`);
    return { ok: true, chatRoomId: body.chatRoomId };
  }

  @SubscribeMessage('chat.message.send')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendChatMessageDto & { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    const message = await this.chats.sendMessage(
      userId,
      body.chatRoomId,
      body.content,
      body.type ?? MessageType.TEXT,
      body.idempotencyKey,
    );
    return { ok: true, message };
  }

  @SubscribeMessage('chat.message.read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    const count = await this.chats.markRead(userId, body.chatRoomId);
    return { ok: true, marked: count };
  }

  @SubscribeMessage('chat.location.update')
  async onLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: UpdateLocationShareDto & { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    await this.chats.updateLocationShare(
      userId,
      body.chatRoomId,
      body.latitude,
      body.longitude,
      body.expiresInSeconds,
    );
    return { ok: true };
  }

  @SubscribeMessage('chat.location.stop')
  async onLocationStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    await this.chats.stopLocationShare(userId, body.chatRoomId);
    return { ok: true };
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken.replace(/^Bearer\s+/i, '');
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.length > 0) {
      return header.replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  private getUserId(client: Socket): string {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.sub) {
      this.logger.warn('Socket action blocked due to missing user context');
      throw new UnauthorizedException();
    }
    return user.sub;
  }
}
