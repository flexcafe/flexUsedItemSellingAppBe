import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { PusherService } from '../../../infrastructure/realtime/pusher.service.js';
import { PusherChannelAuthDto } from '../../../application/dtos/realtime/pusher-channel-auth.dto.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { Inject } from '@nestjs/common';
import { requireActiveAdmin } from '../../../application/use-cases/_helpers/admin-authorization.helper.js';

@ApiTags('Realtime (Pusher)')
@Controller()
export class RealtimeController {
  constructor(
    private readonly pusher: PusherService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Post(`${ROUTE_PREFIX.client}/pusher/auth`)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authorize Pusher private channels (client)' })
  clientAuth(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PusherChannelAuthDto,
  ) {
    const expected = `private-user-${user.sub}`;
    if (dto.channel_name !== expected) {
      throw new ForbiddenException('Forbidden channel');
    }
    return this.pusher.authorizePrivateChannel(dto.socket_id, dto.channel_name);
  }

  @Post(`${ROUTE_PREFIX.adminDashboard}/pusher/auth`)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Authorize Pusher private channels (admin dashboard)',
  })
  async adminAuth(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PusherChannelAuthDto,
  ) {
    await requireActiveAdmin(this.userRepository, user.sub);
    const expected = `private-user-${user.sub}`;
    if (dto.channel_name !== expected) {
      throw new ForbiddenException('Forbidden channel');
    }
    return this.pusher.authorizePrivateChannel(dto.socket_id, dto.channel_name);
  }
}
