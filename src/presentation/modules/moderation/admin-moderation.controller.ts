import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
  ActionContentReportDto,
  AddFilterKeywordDto,
  ContentFilterKeywordDto,
  ContentReportDto,
  ContentReportFilterDto,
  DeactivateFilterKeywordResultDto,
  DismissContentReportDto,
} from '../../../application/dtos/moderation/index.js';
import {
  ActionContentReportUseCase,
  AddContentFilterKeywordUseCase,
  DeactivateContentFilterKeywordUseCase,
  DismissContentReportUseCase,
  ListContentFilterKeywordsUseCase,
  ListContentReportsAdminUseCase,
} from '../../../application/use-cases/moderation/index.js';

@ApiTags('Admin Dashboard Content Moderation')
@Controller(`${ROUTE_PREFIX.adminDashboard}/moderation`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminModerationController {
  constructor(
    private readonly listContentReportsAdmin: ListContentReportsAdminUseCase,
    private readonly actionContentReport: ActionContentReportUseCase,
    private readonly dismissContentReport: DismissContentReportUseCase,
    private readonly listFilterKeywords: ListContentFilterKeywordsUseCase,
    private readonly addFilterKeyword: AddContentFilterKeywordUseCase,
    private readonly deactivateFilterKeyword: DeactivateContentFilterKeywordUseCase,
  ) {}

  @Get('content-reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List content reports (act within 24 hours)',
    description:
      'Admin review queue for objectionable-content flags (App Store Guideline 1.2). ' +
      'Requires `MANAGE_REPORTS`. Prefer filtering `status=PENDING` and actioning promptly.',
  })
  @ApiArraySuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content reports retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin lacks MANAGE_REPORTS permission',
  })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ContentReportFilterDto,
  ): Promise<ApiResponseDto<ContentReportDto[]>> {
    const rows = await this.listContentReportsAdmin.execute(
      user.sub,
      query.status,
    );
    return ApiResponseDto.success(rows, 'Content reports retrieved');
  }

  @Post('content-reports/:reportId/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove objectionable content and optionally eject the user',
    description:
      'Marks the report ACTIONED, soft-removes/hides the target content ' +
      '(listing / chat message / review), optionally bans the reported user (`ejectUser`, default true), ' +
      'and notifies the reporter. Requires `MANAGE_REPORTS`.',
  })
  @ApiParam({
    name: 'reportId',
    description: 'Content report ID',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @ApiSuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content report actioned',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin lacks MANAGE_REPORTS, or cannot ban an admin account',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Content report or reported user not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Report is not pending',
  })
  async action(
    @CurrentUser() user: JwtPayload,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ActionContentReportDto,
  ): Promise<ApiResponseDto<ContentReportDto>> {
    const row = await this.actionContentReport.execute(
      user.sub,
      reportId,
      dto,
    );
    return ApiResponseDto.success(row, 'Content report actioned');
  }

  @Post('content-reports/:reportId/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dismiss a content report',
    description:
      'Marks the report DISMISSED without removing content. Notifies the reporter. Requires `MANAGE_REPORTS`.',
  })
  @ApiParam({
    name: 'reportId',
    description: 'Content report ID',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @ApiSuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content report dismissed',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin lacks MANAGE_REPORTS permission',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Content report not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Report is not pending',
  })
  async dismiss(
    @CurrentUser() user: JwtPayload,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: DismissContentReportDto,
  ): Promise<ApiResponseDto<ContentReportDto>> {
    const row = await this.dismissContentReport.execute(
      user.sub,
      reportId,
      dto,
    );
    return ApiResponseDto.success(row, 'Content report dismissed');
  }

  @Get('filter-keywords')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List objectionable-content filter keywords',
    description:
      'Denylist used when creating listings, sending text chat, or posting reviews. Requires `MANAGE_REPORTS`.',
  })
  @ApiArraySuccessResponse(ContentFilterKeywordDto, {
    status: HttpStatus.OK,
    description: 'Filter keywords retrieved',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin lacks MANAGE_REPORTS permission',
  })
  async listKeywords(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<ContentFilterKeywordDto[]>> {
    const rows = await this.listFilterKeywords.execute(user.sub);
    return ApiResponseDto.success(
      rows.map((row) => new ContentFilterKeywordDto(row)),
      'Filter keywords retrieved',
    );
  }

  @Post('filter-keywords')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a filter keyword',
    description:
      'Upserts an active keyword into the denylist and refreshes the in-memory filter cache. Requires `MANAGE_REPORTS`.',
  })
  @ApiSuccessResponse(ContentFilterKeywordDto, {
    status: HttpStatus.CREATED,
    description: 'Filter keyword added',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failure (keyword length 2–100)',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin lacks MANAGE_REPORTS permission',
  })
  async addKeyword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddFilterKeywordDto,
  ): Promise<ApiResponseDto<ContentFilterKeywordDto>> {
    const row = await this.addFilterKeyword.execute(user.sub, dto);
    return ApiResponseDto.success(
      new ContentFilterKeywordDto(row),
      'Filter keyword added',
    );
  }

  @Delete('filter-keywords/:keywordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate a filter keyword',
    description:
      'Soft-deactivates a keyword (no longer matched by the content filter) and refreshes the cache. Requires `MANAGE_REPORTS`.',
  })
  @ApiParam({
    name: 'keywordId',
    description: 'Filter keyword ID',
    example: '66666666-6666-4666-8666-666666666666',
  })
  @ApiSuccessResponse(DeactivateFilterKeywordResultDto, {
    status: HttpStatus.OK,
    description: 'Filter keyword deactivated',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin lacks MANAGE_REPORTS permission',
  })
  async deactivateKeyword(
    @CurrentUser() user: JwtPayload,
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
  ): Promise<ApiResponseDto<DeactivateFilterKeywordResultDto>> {
    const row = await this.deactivateFilterKeyword.execute(
      user.sub,
      keywordId,
    );
    return ApiResponseDto.success(row, 'Filter keyword deactivated');
  }
}
