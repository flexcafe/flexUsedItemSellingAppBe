import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ApiArraySuccessResponse } from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { NotificationDto } from '../../../application/dtos/notifications/notification.dto.js';
import { ListMyNotificationsUseCase } from '../../../application/use-cases/notifications/list-my-notifications.use-case.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { Inject } from '@nestjs/common';
import { requireActiveAdmin } from '../../../application/use-cases/_helpers/admin-authorization.helper.js';

@ApiTags('Admin Dashboard Notifications')
@Controller(`${ROUTE_PREFIX.adminDashboard}/notifications`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminNotificationsController {
  constructor(
    private readonly listMyNotificationsUseCase: ListMyNotificationsUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List admin notifications' })
  @ApiArraySuccessResponse(NotificationDto, {
    status: HttpStatus.OK,
    description: 'Notifications retrieved',
  })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<NotificationDto[]>> {
    await requireActiveAdmin(this.userRepository, user.sub);
    const rows = await this.listMyNotificationsUseCase.execute(
      user.sub,
      limit ? Number(limit) : 20,
    );
    return ApiResponseDto.success(
      rows.map((r) => new NotificationDto(r)),
      'Notifications retrieved',
    );
  }
}
