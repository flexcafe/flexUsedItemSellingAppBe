import { Module } from '@nestjs/common';
import { ClientNotificationsController } from './client-notifications.controller.js';
import { AdminNotificationsController } from './admin-notifications.controller.js';
import { ListMyNotificationsUseCase } from '../../../application/use-cases/notifications/list-my-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '../../../application/use-cases/notifications/mark-notification-read.use-case.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';

@Module({
  controllers: [ClientNotificationsController, AdminNotificationsController],
  providers: [
    ListMyNotificationsUseCase,
    MarkNotificationReadUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
})
export class NotificationsModule {}
