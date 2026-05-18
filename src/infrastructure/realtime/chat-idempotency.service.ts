import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import type { IChatIdempotencyStore } from '../../domain/services/chat-idempotency.interface.js';

@Injectable()
export class ChatIdempotencyService
  implements IChatIdempotencyStore, OnModuleDestroy
{
  private readonly logger = new Logger(ChatIdempotencyService.name);
  private readonly memory = new Map<string, number>();
  private readonly memoryCounters = new Map<
    string,
    { count: number; resetAtMs: number }
  >();
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

  async allowRateLimitedAction(
    key: string,
    maxActions: number,
    windowSeconds: number,
  ): Promise<boolean> {
    if (this.redisClient && this.redisClient.isOpen) {
      const count = await this.redisClient.incr(key);
      if (count === 1) {
        await this.redisClient.expire(key, windowSeconds);
      }
      return count <= maxActions;
    }

    const now = Date.now();
    const existing = this.memoryCounters.get(key);
    if (!existing || existing.resetAtMs <= now) {
      this.memoryCounters.set(key, {
        count: 1,
        resetAtMs: now + windowSeconds * 1000,
      });
      return true;
    }
    const nextCount = existing.count + 1;
    this.memoryCounters.set(key, {
      count: nextCount,
      resetAtMs: existing.resetAtMs,
    });
    return nextCount <= maxActions;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }
}
