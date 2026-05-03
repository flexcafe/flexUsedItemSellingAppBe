import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js';
import { SendKbzPayInstructionUseCase } from '../../../application/use-cases/auth/send-kbzpay-instruction.use-case.js';
import { AdminVerifyKbzPayUseCase } from '../../../application/use-cases/auth/admin-verify-kbzpay.use-case.js';
import { AdminLoginDto } from '../../../application/dtos/auth/login.dto.js';
import { SendKbzPayInstructionDto } from '../../../application/dtos/auth/send-kbzpay-instruction.dto.js';
import { AdminVerifyKbzPayDto } from '../../../application/dtos/auth/admin-verify-kbzpay.dto.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import {
  AuthResponseDto,
} from '../../../application/dtos/auth/auth-response.dto.js';
import { VerificationActionResultDto } from '../../../application/dtos/auth/verification-action-result.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';

@ApiTags('Admin Dashboard Auth')
@Controller(`${ROUTE_PREFIX.adminDashboard}/auth`)
export class AdminDashboardAuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly sendKbzPayInstructionUseCase: SendKbzPayInstructionUseCase,
    private readonly adminVerifyKbzPayUseCase: AdminVerifyKbzPayUseCase,
  ) {}

  @Public()
  @Throttle({
    'auth-ip': { limit: 20, ttl: 60_000 },
    'auth-id': { limit: 12, ttl: 60_000 },
  })
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin dashboard login (email + password)',
    description:
      'Root and staff admins sign in with email and password. Client accounts must use client phone login.',
  })
  @ApiSuccessResponse(AuthResponseDto, {
    status: HttpStatus.OK,
    description: 'Login successful',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not an admin account',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded for this IP or email',
  })
  async login(
    @Body() dto: AdminLoginDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.loginUseCase.loginAdmin(dto);
    return ApiResponseDto.success(result, 'Login successful');
  }

  @Post('kbzpay/:userId/send-instruction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin sends KBZPay transfer instruction (100 MMK)',
    description:
      'Admin sends phone number where user must transfer 100 MMK for manual KBZPay ownership verification.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'KBZPay transfer instruction sent to user notification',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admin users can perform this action',
  })
  async sendKbzPayInstruction(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SendKbzPayInstructionDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.sendKbzPayInstructionUseCase.execute(
      user.sub,
      userId,
      dto,
    );
    return ApiResponseDto.success(result, 'KBZPay transfer instruction sent');
  }

  @Post('kbzpay/:userId/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin marks KBZPay as VERIFIED',
    description:
      'After admin confirms 100 MMK receipt manually, this endpoint marks KBZPay verification status as VERIFIED.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'KBZPay marked as verified',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admin users can perform this action',
  })
  async adminVerifyKbzPay(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminVerifyKbzPayDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.adminVerifyKbzPayUseCase.execute(
      user.sub,
      userId,
      dto,
    );
    return ApiResponseDto.success(result, 'KBZPay verified successfully');
  }
}

