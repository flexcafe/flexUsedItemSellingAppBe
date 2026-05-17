import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientChatController } from './client-chat.controller.js';
import { AdminChatController } from './admin-chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from '../../../application/use-cases/chat/chat.service.js';
import { ChatRepository } from '../../../infrastructure/repositories/chat.repository.js';
import { ProductRepository } from '../../../infrastructure/repositories/product.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { PointsRepository } from '../../../infrastructure/repositories/points.repository.js';
import { CHAT_REPOSITORY } from '../../../domain/repositories/chat.repository.interface.js';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { POINTS_REPOSITORY } from '../../../domain/repositories/points.repository.interface.js';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { ChatIdempotencyService } from '../../../infrastructure/realtime/chat-idempotency.service.js';
import { CreateTransactionReviewUseCase } from '../../../application/use-cases/points/create-transaction-review.use-case.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ClientChatController, AdminChatController],
  providers: [
    ChatGateway,
    ChatService,
    ChatRealtimeService,
    ChatIdempotencyService,
    CreateTransactionReviewUseCase,
    {
      provide: CHAT_REPOSITORY,
      useClass: ChatRepository,
    },
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: POINTS_REPOSITORY,
      useClass: PointsRepository,
    },
  ],
})
export class ChatModule {}
