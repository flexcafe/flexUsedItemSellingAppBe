import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiBooleanSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { NotificationDto } from '../../../application/dtos/notifications/notification.dto.js';
import { ListMyNotificationsUseCase } from '../../../application/use-cases/notifications/list-my-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '../../../application/use-cases/notifications/mark-notification-read.use-case.js';

@ApiTags('Client Notifications')
@Controller(`${ROUTE_PREFIX.client}/notifications`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientNotificationsController {
  constructor(
    private readonly listMyNotificationsUseCase: ListMyNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List my notifications' })
  @ApiArraySuccessResponse(NotificationDto, {
    status: HttpStatus.OK,
    description: 'Notifications retrieved',
  })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<NotificationDto[]>> {
    const rows = await this.listMyNotificationsUseCase.execute(
      user.sub,
      limit ? Number(limit) : 20,
    );
    return ApiResponseDto.success(
      rows.map((r) => new NotificationDto(r)),
      'Notifications retrieved',
    );
  }

  @Patch(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiBooleanSuccessResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
  })
  async markRead(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<ApiResponseDto<boolean>> {
    await this.markNotificationReadUseCase.execute(user.sub, notificationId);
    return ApiResponseDto.success(true, 'Notification marked as read');
  }
}
