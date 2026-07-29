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
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import {
  AcceptTermsDto,
  TermsAcceptanceStatusDto,
  TermsOfServiceDto,
} from '../../../application/dtos/moderation/index.js';
import {
  AcceptTermsUseCase,
  GetActiveTermsUseCase,
  GetTermsAcceptanceStatusUseCase,
} from '../../../application/use-cases/moderation/index.js';

/**
 * Legal routes must not inherit auth/notify throttlers (no @Throttle → all named
 * limits applied). Public GET /terms runs before login; a shared `anon` bucket
 * was causing 429 and blocking the Terms / login flow.
 */
const LEGAL_SKIP_OTHER_THROTTLES = {
  'auth-ip': true,
  'auth-id': true,
  'admin-notify-ip': true,
  'admin-notify-user': true,
  'review-submit-ip': true,
  'review-submit-user': true,
};

@ApiTags('Client Legal')
@Controller(`${ROUTE_PREFIX.client}/legal`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientLegalController {
  constructor(
    private readonly getActiveTerms: GetActiveTermsUseCase,
    private readonly acceptTerms: AcceptTermsUseCase,
    private readonly getTermsStatus: GetTermsAcceptanceStatusUseCase,
  ) {}

  @Public()
  @Get('terms')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(LEGAL_SKIP_OTHER_THROTTLES)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Get active Terms of Use / EULA',
    description:
      'Present this **before** registration or login (App Store Guideline 1.2). ' +
      'Response includes the zero-tolerance policy for objectionable content. ' +
      'Response also includes stable FE localization keys `titleKey` / `contentKey` (plus `metadata.version`), ' +
      'so the Terms screen can switch languages using the app language switcher. ' +
      'Registration must send `acceptedTerms: true` and `termsVersion` matching `data.version`.',
  })
  @ApiSuccessResponse(TermsOfServiceDto, {
    status: HttpStatus.OK,
    description: 'Terms of Use retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (120 requests / minute per IP)',
  })
  async terms(): Promise<ApiResponseDto<TermsOfServiceDto>> {
    const row = await this.getActiveTerms.execute();
    return ApiResponseDto.success(row, 'Terms of Use retrieved');
  }

  @Post('terms/accept')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(LEGAL_SKIP_OTHER_THROTTLES)
  @Throttle({ 'catalog-detail-ip': { limit: 60, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Accept the current Terms of Use version',
    description:
      'Call after login when `GET .../terms/status` returns `needsAcceptance: true`, ' +
      'or after the user agrees on the Terms screen. `termsVersion` must match the active version.',
  })
  @ApiSuccessResponse(TermsAcceptanceStatusDto, {
    status: HttpStatus.OK,
    description: 'Terms accepted',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'termsVersion does not match the active Terms version',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (60 requests / minute per IP)',
  })
  async accept(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AcceptTermsDto,
  ): Promise<ApiResponseDto<TermsAcceptanceStatusDto>> {
    const row = await this.acceptTerms.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Terms accepted');
  }

  @Get('terms/status')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(LEGAL_SKIP_OTHER_THROTTLES)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Check whether the user must re-accept Terms',
    description:
      'If `needsAcceptance` is true, block app use until the user accepts via `POST .../terms/accept`.',
  })
  @ApiSuccessResponse(TermsAcceptanceStatusDto, {
    status: HttpStatus.OK,
    description: 'Terms status retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (120 requests / minute per IP)',
  })
  async status(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<TermsAcceptanceStatusDto>> {
    const row = await this.getTermsStatus.execute(user.sub);
    return ApiResponseDto.success(row, 'Terms status retrieved');
  }
}
