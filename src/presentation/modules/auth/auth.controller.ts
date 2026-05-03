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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RegisterUseCase } from '../../../application/use-cases/auth/register.use-case.js';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js';
import { SendPhoneOtpUseCase } from '../../../application/use-cases/auth/send-phone-otp.use-case.js';
import { VerifyPhoneOtpUseCase } from '../../../application/use-cases/auth/verify-phone-otp.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/auth/send-email-verification.use-case.js';
import { VerifyEmailVerificationUseCase } from '../../../application/use-cases/auth/verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from '../../../application/use-cases/auth/request-kbzpay-verification.use-case.js';
import { GetCurrentUserProfileUseCase } from '../../../application/use-cases/auth/get-current-user-profile.use-case.js';
import { RegisterDto } from '../../../application/dtos/auth/register.dto.js';
import { ClientLoginDto } from '../../../application/dtos/auth/login.dto.js';
import { SendPhoneOtpDto } from '../../../application/dtos/auth/send-phone-otp.dto.js';
import { VerifyPhoneOtpDto } from '../../../application/dtos/auth/verify-phone-otp.dto.js';
import { SendEmailVerificationDto } from '../../../application/dtos/auth/send-email-verification.dto.js';
import { VerifyEmailVerificationDto } from '../../../application/dtos/auth/verify-email-verification.dto.js';
import { RequestKbzPayVerificationDto } from '../../../application/dtos/auth/request-kbzpay-verification.dto.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import {
  AuthResponseDto,
  UserProfileDto,
} from '../../../application/dtos/auth/auth-response.dto.js';
import { VerificationActionResultDto } from '../../../application/dtos/auth/verification-action-result.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';

@ApiTags('Client Auth')
@Controller(`${ROUTE_PREFIX.client}/auth`)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly sendPhoneOtpUseCase: SendPhoneOtpUseCase,
    private readonly verifyPhoneOtpUseCase: VerifyPhoneOtpUseCase,
    private readonly sendEmailVerificationUseCase: SendEmailVerificationUseCase,
    private readonly verifyEmailVerificationUseCase: VerifyEmailVerificationUseCase,
    private readonly requestKbzPayVerificationUseCase: RequestKbzPayVerificationUseCase,
    private readonly getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase,
  ) {}

  @Public()
  @Throttle({
    'auth-ip': { limit: 15, ttl: 60_000 },
    'auth-id': { limit: 6, ttl: 60_000 },
  })
  @UseGuards(ThrottlerGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register user with phone',
    description:
      'Registration stores profile + KBZPay account, initializes phone OTP + email verification flows, and returns a pending status. Access tokens are issued only after phone + email verification and login.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.CREATED,
    description: 'User registered successfully; verification flows initialized',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failure (password mismatch, invalid referralId)',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone/email already exists',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_GATEWAY,
    description:
      'SMS provider (SMSPoh) rejected the request or returned an error',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded for this IP or phone/email',
  })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.registerUseCase.execute(dto);
    return ApiResponseDto.success(result, 'User registered successfully');
  }

  @Public()
  @Throttle({
    'auth-ip': { limit: 30, ttl: 60_000 },
    'auth-id': { limit: 15, ttl: 60_000 },
  })
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Client login (phone + password)',
    description:
      'Clients sign in with phone and password. Admin users must use POST /admin/dashboard/auth/login with email.',
  })
  @ApiSuccessResponse(AuthResponseDto, {
    status: HttpStatus.OK,
    description: 'Login successful',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin account (use admin dashboard email login)',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded for this IP or phone',
  })
  async login(
    @Body() dto: ClientLoginDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.loginUseCase.loginClient(dto);
    return ApiResponseDto.success(result, 'Login successful');
  }

  @Public()
  @Throttle({
    'auth-ip': { limit: 10, ttl: 60_000 },
    'auth-id': { limit: 4, ttl: 60_000 },
  })
  @UseGuards(ThrottlerGuard)
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send phone OTP',
    description:
      'Creates a fresh OTP for the provided phone (expiring previous pending OTP rows) and delivers the code via SMS using SMSPoh.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'OTP generated and SMS dispatch accepted',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Phone does not belong to a registered user',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_GATEWAY,
    description:
      'SMS provider (SMSPoh) rejected the request or returned an error',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded for this IP or phone',
  })
  async sendPhoneOtp(
    @Body() dto: SendPhoneOtpDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.sendPhoneOtpUseCase.execute(dto);
    return ApiResponseDto.success(result, 'Phone OTP sent successfully');
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify phone OTP',
    description:
      'Validates pending OTP code and marks user phone verification as completed on success.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'Phone verified successfully',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No pending OTP or invalid payload',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'OTP expired, invalid code, or max attempts exceeded',
  })
  async verifyPhoneOtp(
    @Body() dto: VerifyPhoneOtpDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.verifyPhoneOtpUseCase.execute(dto);
    return ApiResponseDto.success(result, 'Phone verified successfully');
  }

  @Public()
  @Throttle({
    'auth-ip': { limit: 10, ttl: 60_000 },
    'auth-id': { limit: 4, ttl: 60_000 },
  })
  @UseGuards(ThrottlerGuard)
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send email verification token',
    description:
      'Creates a fresh email verification token and expires previous pending token entries for the same email.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'Email verification token generated successfully',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email does not belong to a registered user',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded for this IP or email',
  })
  async sendEmailVerification(
    @Body() dto: SendEmailVerificationDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.sendEmailVerificationUseCase.execute(dto);
    return ApiResponseDto.success(
      result,
      'Email verification token sent successfully',
    );
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email token',
    description:
      'Validates pending email verification token and marks user email verification as completed on success.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'Email verified successfully',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or inactive token',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Verification token expired',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailVerificationDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.verifyEmailVerificationUseCase.execute(dto);
    return ApiResponseDto.success(result, 'Email verified successfully');
  }

  @Post('kbzpay/request-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request KBZPay verification (user action)',
    description:
      'Sets KBZPay status to PENDING. User will receive notification that admin will send transfer phone number for manual 100 MMK check.',
  })
  @ApiSuccessResponse(VerificationActionResultDto, {
    status: HttpStatus.OK,
    description: 'KBZPay verification request created',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'KBZPay is already verified',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or KBZPay account not found',
  })
  async requestKbzPayVerification(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestKbzPayVerificationDto,
  ): Promise<ApiResponseDto<VerificationActionResultDto>> {
    const result = await this.requestKbzPayVerificationUseCase.execute(
      user.sub,
      dto,
    );
    return ApiResponseDto.success(
      result,
      'KBZPay verification requested successfully',
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Returns auth profile with phone/email verification states, KBZPay status, and profile details.',
  })
  @ApiSuccessResponse(UserProfileDto, {
    status: HttpStatus.OK,
    description: 'Current user profile retrieved',
  })
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<UserProfileDto>> {
    const profile = await this.getCurrentUserProfileUseCase.execute(user.sub);
    return ApiResponseDto.success(profile, 'User info retrieved');
  }
}
