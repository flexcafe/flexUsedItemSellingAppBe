import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket, Server } from 'socket.io';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { ChatIdempotencyService } from '../../../infrastructure/realtime/chat-idempotency.service.js';
import { ListChatRoomsUseCase } from '../../../application/use-cases/chat/list-chat-rooms.use-case.js';
import { ListChatMessagesUseCase } from '../../../application/use-cases/chat/list-chat-messages.use-case.js';
import { SendChatMessageUseCase } from '../../../application/use-cases/chat/send-chat-message.use-case.js';
import { MarkChatRoomReadUseCase } from '../../../application/use-cases/chat/mark-chat-room-read.use-case.js';
import { UpdateChatLocationShareUseCase } from '../../../application/use-cases/chat/update-chat-location-share.use-case.js';
import { StopChatLocationShareUseCase } from '../../../application/use-cases/chat/stop-chat-location-share.use-case.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import {
  SendChatMessageDto,
  UpdateLocationShareDto,
} from '../../../application/dtos/chat/chat.dto.js';

type SocketUser = {
  sub: string;
  phone?: string;
};

const LOCATION_UPDATE_WINDOW_SECONDS = 3;
const LOCATION_UPDATE_MAX_ACTIONS = 1;
const MESSAGE_BURST_WINDOW_SECONDS = 3;
const MESSAGE_BURST_MAX_ACTIONS = 5;
const MESSAGE_SUSTAINED_WINDOW_SECONDS = 60;
const MESSAGE_SUSTAINED_MAX_ACTIONS = 60;

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
    ],
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
    private readonly idempotency: ChatIdempotencyService,
    private readonly listChatMessages: ListChatMessagesUseCase,
    private readonly listChatRooms: ListChatRoomsUseCase,
    private readonly sendChatMessage: SendChatMessageUseCase,
    private readonly markChatRoomRead: MarkChatRoomReadUseCase,
    private readonly updateChatLocationShare: UpdateChatLocationShareUseCase,
    private readonly stopChatLocationShare: StopChatLocationShareUseCase,
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
      (client.data as { user?: SocketUser }).user = payload;
      void client.join(`user:${payload.sub}`);
      this.activeConnections += 1;
      this.logger.debug(`chat.gateway.connections=${this.activeConnections}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const hasUser = Boolean((client.data as { user?: SocketUser }).user?.sub);
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
    const page = await this.listChatMessages.execute(
      userId,
      body.chatRoomId,
      null,
      1,
    );
    if (page.items.length === 0 && !page.nextCursor) {
      await this.listChatRooms.execute(userId, null, 1);
    }
    void client.join(`chat:${body.chatRoomId}`);
    return { ok: true, chatRoomId: body.chatRoomId };
  }

  @SubscribeMessage('chat.leave')
  onLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatRoomId: string },
  ) {
    void client.leave(`chat:${body.chatRoomId}`);
    return { ok: true, chatRoomId: body.chatRoomId };
  }

  @SubscribeMessage('chat.message.send')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendChatMessageDto & { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    const burstAllowed = await this.idempotency.allowRateLimitedAction(
      `chat:message-burst:${userId}:${body.chatRoomId}`,
      MESSAGE_BURST_MAX_ACTIONS,
      MESSAGE_BURST_WINDOW_SECONDS,
    );
    if (!burstAllowed) {
      throw new WsException(
        'Too many messages in a short time. Please slow down.',
      );
    }

    const sustainedAllowed = await this.idempotency.allowRateLimitedAction(
      `chat:message-sustained:${userId}`,
      MESSAGE_SUSTAINED_MAX_ACTIONS,
      MESSAGE_SUSTAINED_WINDOW_SECONDS,
    );
    if (!sustainedAllowed) {
      throw new WsException(
        'Message rate limit reached. Try again in a moment.',
      );
    }

    const message = await this.sendChatMessage.execute(
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
    const count = await this.markChatRoomRead.execute(userId, body.chatRoomId);
    return { ok: true, marked: count };
  }

  @SubscribeMessage('chat.location.update')
  async onLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: UpdateLocationShareDto & { chatRoomId: string },
  ) {
    const userId = this.getUserId(client);
    const allowed = await this.idempotency.allowRateLimitedAction(
      `chat:location-update:${userId}:${body.chatRoomId}`,
      LOCATION_UPDATE_MAX_ACTIONS,
      LOCATION_UPDATE_WINDOW_SECONDS,
    );
    if (!allowed) {
      throw new WsException(
        'Location updates are limited to once every 3 seconds',
      );
    }
    await this.updateChatLocationShare.execute(
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
    await this.stopChatLocationShare.execute(userId, body.chatRoomId);
    return { ok: true };
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
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
    const user = (client.data as { user?: SocketUser }).user;
    if (!user?.sub) {
      this.logger.warn('Socket action blocked due to missing user context');
      throw new UnauthorizedException();
    }
    return user.sub;
  }
}
