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
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import {
  SubmitSuggestionDto,
  SuggestionDto,
} from '../../../application/dtos/suggestions/index.js';
import { SubmitSuggestionUseCase } from '../../../application/use-cases/suggestions/submit-suggestion.use-case.js';
import { ListMySuggestionsUseCase } from '../../../application/use-cases/suggestions/list-my-suggestions.use-case.js';

/** Without SkipThrottle, every named throttler applies (incl. auth-id / admin-notify). */
const SKIP_AUTH_REVIEW_CATALOG = {
  'auth-ip': true,
  'auth-id': true,
  'review-submit-ip': true,
  'review-submit-user': true,
  'catalog-search-ip': true,
  'catalog-detail-ip': true,
};

const SKIP_NOTIFY_AND_AUTH = {
  ...SKIP_AUTH_REVIEW_CATALOG,
  'admin-notify-ip': true,
  'admin-notify-user': true,
};

@ApiTags('Client Suggestions')
@Controller(`${ROUTE_PREFIX.client}/suggestions`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientSuggestionsController {
  constructor(
    private readonly submitSuggestion: SubmitSuggestionUseCase,
    private readonly listMySuggestions: ListMySuggestionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SkipThrottle(SKIP_AUTH_REVIEW_CATALOG)
  @Throttle({
    'admin-notify-ip': { limit: 40, ttl: 60_000 },
    'admin-notify-user': { limit: 20, ttl: 3_600_000 },
  })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Submit a suggestion (nickname, name, details)',
    description:
      'Sends the suggestion to the admin dashboard. Admins may reward points if useful.',
  })
  @ApiSuccessResponse(SuggestionDto, {
    status: HttpStatus.CREATED,
    description: 'Suggestion submitted',
  })
  async submit(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitSuggestionDto,
  ): Promise<ApiResponseDto<SuggestionDto>> {
    const row = await this.submitSuggestion.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Suggestion submitted');
  }

  @Get('mine')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle(SKIP_NOTIFY_AND_AUTH)
  @Throttle({ 'catalog-detail-ip': { limit: 120, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'List my submitted suggestions' })
  @ApiArraySuccessResponse(SuggestionDto, {
    status: HttpStatus.OK,
    description: 'Suggestions retrieved',
  })
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<SuggestionDto[]>> {
    const rows = await this.listMySuggestions.execute(user.sub);
    return ApiResponseDto.success(rows, 'Suggestions retrieved');
  }
}
