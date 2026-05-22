import { Logger, type INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

/** Wired manually in main.ts — not a Nest DI provider (IoAdapter needs the app instance). */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private readonly redisUrl: string | null;

  constructor(app: INestApplicationContext) {
    super(app);
    const configService = app.get(ConfigService);
    this.redisUrl = configService.get<string>('REDIS_URL') ?? null;
  }

  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured, Socket.IO will run without Redis adapter',
      );
      return;
    }
    try {
      this.pubClient = createClient({ url: this.redisUrl });
      this.subClient = this.pubClient.duplicate();
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.logger.log(
        `Socket.IO Redis adapter connected (${this.maskRedisUrl(this.redisUrl)})`,
      );
    } catch (err) {
      this.logger.error(
        `Socket.IO Redis adapter failed (${this.maskRedisUrl(this.redisUrl)}): ${String(err)}`,
      );
      throw err;
    }
  }

  private maskRedisUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      return parsed.toString();
    } catch {
      return '(invalid REDIS_URL)';
    }
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
          'http://localhost:3000',
        ],
        credentials: true,
      },
      ...options,
    }) as Server;
    if (this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }
    return server;
  }

  async close(): Promise<void> {
    if (this.pubClient?.isOpen) {
      await this.pubClient.quit();
    }
    if (this.subClient?.isOpen) {
      await this.subClient.quit();
    }
  }
}
