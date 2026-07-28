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
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ApiSuccessResponse } from '../../../common/decorators/api-response.decorator.js';
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

@ApiTags('Client Legal')
@Controller(`${ROUTE_PREFIX.client}/legal`)
@UseGuards(JwtAuthGuard, ThrottlerGuard)
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
  @ApiOperation({
    summary: 'Get active Terms of Use / EULA',
    description:
      'Present this before registration or login. Includes zero-tolerance policy for objectionable content.',
  })
  @ApiSuccessResponse(TermsOfServiceDto, {
    status: HttpStatus.OK,
    description: 'Terms of Use retrieved',
  })
  async terms(): Promise<ApiResponseDto<TermsOfServiceDto>> {
    const row = await this.getActiveTerms.execute();
    return ApiResponseDto.success(row, 'Terms of Use retrieved');
  }

  @Post('terms/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept the current Terms of Use version' })
  @ApiSuccessResponse(TermsAcceptanceStatusDto, {
    status: HttpStatus.OK,
    description: 'Terms accepted',
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
  @ApiOperation({ summary: 'Check whether the user must re-accept Terms' })
  @ApiSuccessResponse(TermsAcceptanceStatusDto, {
    status: HttpStatus.OK,
    description: 'Terms status retrieved',
  })
  async status(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<TermsAcceptanceStatusDto>> {
    const row = await this.getTermsStatus.execute(user.sub);
    return ApiResponseDto.success(row, 'Terms status retrieved');
  }
}
