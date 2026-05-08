import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

@Injectable()
export class PusherService {
  private readonly client: Pusher | null;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('PUSHER_APP_ID');
    const key = this.configService.get<string>('PUSHER_KEY');
    const secret = this.configService.get<string>('PUSHER_SECRET');
    const cluster = this.configService.get<string>('PUSHER_CLUSTER');

    if (!appId || !key || !secret || !cluster) {
      this.client = null;
      return;
    }

    this.client = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  async trigger(
    channel: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.trigger(channel, event, payload);
  }
}
