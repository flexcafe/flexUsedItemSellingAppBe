import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import {
  CreateAdminUserDto,
  UpdateAdminUserRoleDto,
  AdminUserListDto,
} from '../../../application/dtos/admin-users/index.js';
import { CreateAdminUserUseCase } from '../../../application/use-cases/admin-users/create-admin-user.use-case.js';
import { ListAdminUsersUseCase } from '../../../application/use-cases/admin-users/list-admin-users.use-case.js';
import { UpdateAdminUserRoleUseCase } from '../../../application/use-cases/admin-users/update-admin-user-role.use-case.js';
import { DemoteAdminUserUseCase } from '../../../application/use-cases/admin-users/demote-admin-user.use-case.js';
import {
  ADMIN_USER_MANAGEMENT_WORKFLOW,
  ADMIN_USER_LIST_DOC,
  ADMIN_USER_CREATE_DOC,
  ADMIN_USER_UPDATE_ROLE_DOC,
  ADMIN_USER_DEMOTE_DOC,
} from './admin-users.swagger.js';

@ApiTags('Admin Dashboard Admin Users')
@Controller(`${ROUTE_PREFIX.adminDashboard}/admin-users`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private readonly createAdminUser: CreateAdminUserUseCase,
    private readonly listAdminUsers: ListAdminUsersUseCase,
    private readonly updateAdminUserRole: UpdateAdminUserRoleUseCase,
    private readonly demoteAdminUser: DemoteAdminUserUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all admin users with their roles',
    description: `## List admin users\n\n${ADMIN_USER_MANAGEMENT_WORKFLOW}\n\n${ADMIN_USER_LIST_DOC}`,
  })
  @ApiArraySuccessResponse(AdminUserListDto, {
    status: HttpStatus.OK,
    description: 'Admin users retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only root admin can access this endpoint',
  })
  async list(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<AdminUserListDto[]>> {
    const users = await this.listAdminUsers.execute(user.sub);
    return ApiResponseDto.success(users, 'Admin users retrieved');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new admin user with a role',
    description: `## Create admin user\n\n${ADMIN_USER_MANAGEMENT_WORKFLOW}\n\n${ADMIN_USER_CREATE_DOC}`,
  })
  @ApiSuccessResponse(AdminUserListDto, {
    status: HttpStatus.CREATED,
    description: 'Admin user created',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone/email already exists',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin role not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only root admin can perform this action',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAdminUserDto,
  ): Promise<ApiResponseDto<AdminUserListDto>> {
    const result = await this.createAdminUser.execute(user.sub, dto);
    return ApiResponseDto.success(result, 'Admin user created');
  }

  @Patch(':userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change admin user role',
    description: `## Update admin user role\n\n${ADMIN_USER_MANAGEMENT_WORKFLOW}\n\n${ADMIN_USER_UPDATE_ROLE_DOC}`,
  })
  @ApiSuccessResponse(AdminUserListDto, {
    status: HttpStatus.OK,
    description: 'Admin user role updated',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or admin role not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot change own role or ROOT_ADMIN cannot be assigned',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only root admin can perform this action',
  })
  async updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateAdminUserRoleDto,
  ): Promise<ApiResponseDto<AdminUserListDto>> {
    const result = await this.updateAdminUserRole.execute(
      user.sub,
      userId,
      dto,
    );
    return ApiResponseDto.success(result, 'Admin user role updated');
  }

  @Delete(':userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demote admin user to client (remove admin role)',
    description: `## Demote admin user\n\n${ADMIN_USER_MANAGEMENT_WORKFLOW}\n\n${ADMIN_USER_DEMOTE_DOC}`,
  })
  @ApiSuccessResponse(AdminUserListDto, {
    status: HttpStatus.OK,
    description: 'Admin user demoted to client',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot demote yourself or user is not an admin',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only root admin can perform this action',
  })
  async demote(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponseDto<AdminUserListDto>> {
    const result = await this.demoteAdminUser.execute(user.sub, userId);
    return ApiResponseDto.success(result, 'Admin user demoted');
  }
}
