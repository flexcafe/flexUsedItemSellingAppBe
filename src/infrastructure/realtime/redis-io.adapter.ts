import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

@Injectable()
export class RedisIoAdapter extends IoAdapter implements OnModuleDestroy {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private readonly redisUrl: string | null;

  constructor(
    app: INestApplicationContext,
    configService: ConfigService,
  ) {
    super(app);
    this.redisUrl = configService.get<string>('REDIS_URL') ?? null;
  }

  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured, Socket.IO will run without Redis adapter',
      );
      return;
    }
    this.pubClient = createClient({ url: this.redisUrl });
    this.subClient = this.pubClient.duplicate();
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.logger.log('Socket.IO Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
        credentials: true,
      },
      ...options,
    });
    if (this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }
    return server;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pubClient?.isOpen) {
      await this.pubClient.quit();
    }
    if (this.subClient?.isOpen) {
      await this.subClient.quit();
    }
  }
}
