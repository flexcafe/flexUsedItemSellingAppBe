import { Global, Module } from '@nestjs/common';
import { PusherService } from './pusher.service.js';

@Global()
@Module({
  providers: [PusherService],
  exports: [PusherService],
})
export class RealtimeModule {}
