import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterUseCase } from '../../../application/use-cases/auth/register.use-case.js';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js';
import { SendPhoneOtpUseCase } from '../../../application/use-cases/auth/send-phone-otp.use-case.js';
import { VerifyPhoneOtpUseCase } from '../../../application/use-cases/auth/verify-phone-otp.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/auth/send-email-verification.use-case.js';
import { VerifyEmailVerificationUseCase } from '../../../application/use-cases/auth/verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from '../../../application/use-cases/auth/request-kbzpay-verification.use-case.js';
import { GetCurrentUserProfileUseCase } from '../../../application/use-cases/auth/get-current-user-profile.use-case.js';
import { RegisterDto } from '../../../application/dtos/auth/register.dto.js';
import { LoginDto } from '../../../application/dtos/auth/login.dto.js';
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
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register user (PHONE_AND_FACEBOOK or PHONE_ONLY)',
    description:
      'PHONE_AND_FACEBOOK requires facebookId. PHONE_ONLY must not include facebookId. Registration stores profile, KBZPay account, creates pending phone OTP and email verification token, and returns access token.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'User registered successfully and verification flows initialized',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation failure (password mismatch, invalid registrationType rules, invalid referralId)',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone/email/facebookId already exists',
  })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.registerUseCase.execute(dto);
    return ApiResponseDto.success(result, 'User registered successfully');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with phone+password or facebookId+password',
    description:
      'Exactly one login mode is allowed in each request: phone+password OR facebookId+password.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Both or neither login identifiers were provided',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account',
  })
  async login(@Body() dto: LoginDto): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.loginUseCase.execute(dto);
    return ApiResponseDto.success(result, 'Login successful');
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send phone OTP',
    description:
      'Creates a fresh OTP for provided phone and expires previous pending OTP entries for the same phone.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Phone does not belong to a registered user',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phone verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No pending OTP or invalid payload',
  })
  @ApiResponse({
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
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send email verification token',
    description:
      'Creates a fresh email verification token and expires previous pending token entries for the same email.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verification token generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email does not belong to a registered user',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or inactive token',
  })
  @ApiResponse({
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KBZPay verification request created',
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
  @ApiResponse({
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
