import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class ChatIdempotencyService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatIdempotencyService.name);
  private readonly memory = new Map<string, number>();
  private readonly redisClient: RedisClientType | null = null;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return;
    }
    this.redisClient = createClient({ url: redisUrl });
    this.redisClient.on('error', (err) => {
      this.logger.warn(`Redis idempotency disabled: ${String(err)}`);
    });
    void this.redisClient.connect().catch((err) => {
      this.logger.warn(`Redis idempotency connect failed: ${String(err)}`);
    });
  }

  async reserve(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.redisClient && this.redisClient.isOpen) {
      const result = await this.redisClient.set(key, '1', {
        NX: true,
        EX: ttlSeconds,
      });
      return result === 'OK';
    }

    const now = Date.now();
    const existing = this.memory.get(key);
    if (existing && existing > now) {
      return false;
    }
    this.memory.set(key, now + ttlSeconds * 1000);
    return true;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }
}
