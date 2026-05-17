import { Global, Module } from '@nestjs/common';
import { PusherService } from './pusher.service.js';
import { RedisIoAdapter } from './redis-io.adapter.js';

@Global()
@Module({
  providers: [PusherService, RedisIoAdapter],
  exports: [PusherService, RedisIoAdapter],
})
export class RealtimeModule {}
