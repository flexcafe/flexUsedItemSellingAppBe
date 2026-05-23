import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  AdminPermissionListDto,
  AdminRoleDto,
  CreateAdminRoleDto,
} from '../../../application/dtos/admin-roles/index.js';
import { CreateAdminRoleUseCase } from '../../../application/use-cases/admin-roles/create-admin-role.use-case.js';
import { ListAdminRolesUseCase } from '../../../application/use-cases/admin-roles/list-admin-roles.use-case.js';
import { ListAdminPermissionsUseCase } from '../../../application/use-cases/admin-roles/list-admin-permissions.use-case.js';

@ApiTags('Admin Dashboard Admin Roles')
@Controller(`${ROUTE_PREFIX.adminDashboard}/admin-roles`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminRolesController {
  constructor(
    private readonly createAdminRole: CreateAdminRoleUseCase,
    private readonly listAdminRoles: ListAdminRolesUseCase,
    private readonly listAdminPermissions: ListAdminPermissionsUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List admin roles with permissions',
    description:
      'Accessible by ROOT_ADMIN only. Includes static ROOT_ADMIN role and dynamic custom roles.',
  })
  @ApiArraySuccessResponse(AdminRoleDto, {
    status: HttpStatus.OK,
    description: 'Admin roles retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only root admin can access this endpoint',
  })
  async list(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<AdminRoleDto[]>> {
    const roles = await this.listAdminRoles.execute(user.sub);
    return ApiResponseDto.success(roles, 'Admin roles retrieved');
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List available admin permissions',
    description:
      'Accessible by ROOT_ADMIN only. This can be used by dashboard forms when creating custom admin roles.',
  })
  @ApiSuccessResponse(AdminPermissionListDto, {
    status: HttpStatus.OK,
    description: 'Admin permissions retrieved',
  })
  async permissions(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<AdminPermissionListDto>> {
    const data = await this.listAdminPermissions.execute(user.sub);
    return ApiResponseDto.success(data, 'Admin permissions retrieved');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create admin role with selected permissions',
    description:
      'Accessible by ROOT_ADMIN only. ROOT_ADMIN role cannot be created or modified from this endpoint.',
  })
  @ApiSuccessResponse(AdminRoleDto, {
    status: HttpStatus.CREATED,
    description: 'Admin role created',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Admin role name already exists',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payload or system role conflict',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAdminRoleDto,
  ): Promise<ApiResponseDto<AdminRoleDto>> {
    const role = await this.createAdminRole.execute(user.sub, dto);
    return ApiResponseDto.success(role, 'Admin role created');
  }
}
