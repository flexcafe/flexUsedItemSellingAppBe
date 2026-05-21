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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiArraySuccessResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { SubmitSuggestionDto, SuggestionDto } from '../../../application/dtos/suggestions/index.js';
import { SubmitSuggestionUseCase } from '../../../application/use-cases/suggestions/submit-suggestion.use-case.js';
import { ListMySuggestionsUseCase } from '../../../application/use-cases/suggestions/list-my-suggestions.use-case.js';

@ApiTags('Client Suggestions')
@Controller(`${ROUTE_PREFIX.client}/suggestions`)
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ClientSuggestionsController {
  constructor(
    private readonly submitSuggestion: SubmitSuggestionUseCase,
    private readonly listMySuggestions: ListMySuggestionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'admin-notify-user': { limit: 20, ttl: 3_600_000 } })
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
