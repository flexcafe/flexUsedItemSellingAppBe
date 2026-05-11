import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

const PAYLOAD_LOG_MAX_CHARS = 1200;

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly client: Pusher | null;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('PUSHER_APP_ID');
    const key = this.configService.get<string>('PUSHER_KEY');
    const secret = this.configService.get<string>('PUSHER_SECRET');
    const cluster = this.configService.get<string>('PUSHER_CLUSTER');

    if (!appId || !key || !secret || !cluster) {
      this.client = null;
      this.logger.warn(
        'Pusher disabled: set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER — realtime triggers will be no-ops',
      );
      return;
    }

    this.client = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    this.logger.log(`Pusher client ready (appId=${appId}, cluster=${cluster})`);
  }

  async trigger(
    channel: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `[pusher:trigger:skipped] channel=${channel} event=${event} reason=not_configured payload=${this.payloadPreview(payload)}`,
      );
      return;
    }
    this.logger.log(
      `[pusher:trigger:start] channel=${channel} event=${event} payload=${this.payloadPreview(payload)}`,
    );
    try {
      await this.client.trigger(channel, event, payload);
      this.logger.log(`[pusher:trigger:ok] channel=${channel} event=${event}`);
    } catch (err) {
      this.logger.error(
        `[pusher:trigger:error] channel=${channel} event=${event}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  authorizePrivateChannel(socketId: string, channelName: string) {
    if (!this.client) {
      this.logger.warn(
        `[pusher:auth:skipped] socketId=${socketId} channel=${channelName} reason=not_configured`,
      );
      return { auth: '' };
    }
    this.logger.log(
      `[pusher:auth:start] socketId=${socketId} channel=${channelName}`,
    );
    try {
      const auth = this.client.authorizeChannel(socketId, channelName);
      this.logger.log(
        `[pusher:auth:ok] channel=${channelName} (auth payload length=${typeof auth?.auth === 'string' ? auth.auth.length : 0})`,
      );
      return auth;
    } catch (err) {
      this.logger.error(
        `[pusher:auth:error] socketId=${socketId} channel=${channelName}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  private payloadPreview(payload: unknown): string {
    try {
      const s =
        typeof payload === 'string'
          ? payload
          : JSON.stringify(payload, null, 0);
      if (s.length <= PAYLOAD_LOG_MAX_CHARS) {
        return s;
      }
      return `${s.slice(0, PAYLOAD_LOG_MAX_CHARS)}…(truncated, ${s.length} chars)`;
    } catch {
      return '[unserializable payload]';
    }
  }
}
