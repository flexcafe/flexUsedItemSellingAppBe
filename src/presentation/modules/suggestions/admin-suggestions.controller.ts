import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
  DismissSuggestionDto,
  RewardSuggestionDto,
  SuggestionDto,
  SuggestionFilterDto,
} from '../../../application/dtos/suggestions/index.js';
import { ListSuggestionsAdminUseCase } from '../../../application/use-cases/suggestions/list-suggestions-admin.use-case.js';
import { RewardSuggestionUseCase } from '../../../application/use-cases/suggestions/reward-suggestion.use-case.js';
import { DismissSuggestionUseCase } from '../../../application/use-cases/suggestions/dismiss-suggestion.use-case.js';

@ApiTags('Admin Dashboard Suggestions')
@Controller(`${ROUTE_PREFIX.adminDashboard}/suggestions`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminSuggestionsController {
  constructor(
    private readonly listSuggestionsAdmin: ListSuggestionsAdminUseCase,
    private readonly rewardSuggestion: RewardSuggestionUseCase,
    private readonly dismissSuggestion: DismissSuggestionUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List user suggestions for admin review',
    description:
      'Filter by status (default: all). Pending items await reward or dismiss.',
  })
  @ApiArraySuccessResponse(SuggestionDto, {
    status: HttpStatus.OK,
    description: 'Suggestions retrieved',
  })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: SuggestionFilterDto,
  ): Promise<ApiResponseDto<SuggestionDto[]>> {
    const rows = await this.listSuggestionsAdmin.execute(
      user.sub,
      query.status,
    );
    return ApiResponseDto.success(rows, 'Suggestions retrieved');
  }

  @Post(':suggestionId/reward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark suggestion useful and award points to the user',
  })
  @ApiSuccessResponse(SuggestionDto, {
    status: HttpStatus.OK,
    description: 'Suggestion rewarded',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Suggestion is not pending',
  })
  async reward(
    @CurrentUser() user: JwtPayload,
    @Param('suggestionId', ParseUUIDPipe) suggestionId: string,
    @Body() dto: RewardSuggestionDto,
  ): Promise<ApiResponseDto<SuggestionDto>> {
    const row = await this.rewardSuggestion.execute(
      user.sub,
      suggestionId,
      dto,
    );
    return ApiResponseDto.success(row, 'Suggestion rewarded');
  }

  @Post(':suggestionId/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dismiss suggestion without awarding points',
  })
  @ApiSuccessResponse(SuggestionDto, {
    status: HttpStatus.OK,
    description: 'Suggestion dismissed',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Suggestion is not pending',
  })
  async dismiss(
    @CurrentUser() user: JwtPayload,
    @Param('suggestionId', ParseUUIDPipe) suggestionId: string,
    @Body() dto: DismissSuggestionDto,
  ): Promise<ApiResponseDto<SuggestionDto>> {
    const row = await this.dismissSuggestion.execute(
      user.sub,
      suggestionId,
      dto,
    );
    return ApiResponseDto.success(row, 'Suggestion dismissed');
  }
}
