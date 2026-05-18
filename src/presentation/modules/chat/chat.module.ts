import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientChatController } from './client-chat.controller.js';
import { AdminChatController } from './admin-chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatRepository } from '../../../infrastructure/repositories/chat.repository.js';
import { ProductRepository } from '../../../infrastructure/repositories/product.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { PointsRepository } from '../../../infrastructure/repositories/points.repository.js';
import { CHAT_REPOSITORY } from '../../../domain/repositories/chat.repository.interface.js';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { POINTS_REPOSITORY } from '../../../domain/repositories/points.repository.interface.js';
import { CHAT_REALTIME } from '../../../domain/services/chat-realtime.interface.js';
import { CHAT_IDEMPOTENCY_STORE } from '../../../domain/services/chat-idempotency.interface.js';
import { CHAT_MESSAGE_PUBLISHER } from '../../../domain/services/chat-message-publisher.interface.js';
import { ChatRealtimeService } from '../../../infrastructure/realtime/chat-realtime.service.js';
import { ChatIdempotencyService } from '../../../infrastructure/realtime/chat-idempotency.service.js';
import { ChatMessagePublisherService } from '../../../infrastructure/realtime/chat-message.publisher.js';
import { CreateTransactionReviewUseCase } from '../../../application/use-cases/points/create-transaction-review.use-case.js';
import { OpenChatRoomUseCase } from '../../../application/use-cases/chat/open-chat-room.use-case.js';
import { ListChatRoomsUseCase } from '../../../application/use-cases/chat/list-chat-rooms.use-case.js';
import { ListChatMessagesUseCase } from '../../../application/use-cases/chat/list-chat-messages.use-case.js';
import { SendChatMessageUseCase } from '../../../application/use-cases/chat/send-chat-message.use-case.js';
import { MarkChatRoomReadUseCase } from '../../../application/use-cases/chat/mark-chat-room-read.use-case.js';
import { StartDirectTradeUseCase } from '../../../application/use-cases/chat/start-direct-trade.use-case.js';
import { UpdateChatLocationShareUseCase } from '../../../application/use-cases/chat/update-chat-location-share.use-case.js';
import { StopChatLocationShareUseCase } from '../../../application/use-cases/chat/stop-chat-location-share.use-case.js';
import { RequestChatSafePaymentUseCase } from '../../../application/use-cases/chat/request-chat-safe-payment.use-case.js';
import { GetChatSafePaymentStatusUseCase } from '../../../application/use-cases/chat/get-chat-safe-payment-status.use-case.js';
import { SubmitChatSafePaymentUseCase } from '../../../application/use-cases/chat/submit-chat-safe-payment.use-case.js';
import { ListAwaitingSafePaymentInstructionsUseCase } from '../../../application/use-cases/chat/list-awaiting-safe-payment-instructions.use-case.js';
import { AdminSendSafePaymentInstructionUseCase } from '../../../application/use-cases/chat/admin-send-safe-payment-instruction.use-case.js';
import { CompleteChatTransactionUseCase } from '../../../application/use-cases/chat/complete-chat-transaction.use-case.js';
import { AdminMarkSafePaymentReceivedUseCase } from '../../../application/use-cases/chat/admin-mark-safe-payment-received.use-case.js';
import { AdminMarkSafePaymentTransferredUseCase } from '../../../application/use-cases/chat/admin-mark-safe-payment-transferred.use-case.js';
import { ListPendingSafePaymentsUseCase } from '../../../application/use-cases/chat/list-pending-safe-payments.use-case.js';
import { SubmitChatReviewAfterCompletionUseCase } from '../../../application/use-cases/chat/submit-chat-review-after-completion.use-case.js';

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
    OpenChatRoomUseCase,
    ListChatRoomsUseCase,
    ListChatMessagesUseCase,
    SendChatMessageUseCase,
    MarkChatRoomReadUseCase,
    StartDirectTradeUseCase,
    UpdateChatLocationShareUseCase,
    StopChatLocationShareUseCase,
    RequestChatSafePaymentUseCase,
    GetChatSafePaymentStatusUseCase,
    SubmitChatSafePaymentUseCase,
    CompleteChatTransactionUseCase,
    ListAwaitingSafePaymentInstructionsUseCase,
    AdminSendSafePaymentInstructionUseCase,
    AdminMarkSafePaymentReceivedUseCase,
    AdminMarkSafePaymentTransferredUseCase,
    ListPendingSafePaymentsUseCase,
    SubmitChatReviewAfterCompletionUseCase,
    ChatRealtimeService,
    ChatIdempotencyService,
    ChatMessagePublisherService,
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
    {
      provide: CHAT_REALTIME,
      useExisting: ChatRealtimeService,
    },
    {
      provide: CHAT_IDEMPOTENCY_STORE,
      useExisting: ChatIdempotencyService,
    },
    {
      provide: CHAT_MESSAGE_PUBLISHER,
      useExisting: ChatMessagePublisherService,
    },
  ],
})
export class ChatModule {}
