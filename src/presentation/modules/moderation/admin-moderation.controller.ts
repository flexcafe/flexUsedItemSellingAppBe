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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  ActionContentReportDto,
  AddFilterKeywordDto,
  ContentReportDto,
  ContentReportFilterDto,
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
  })
  @ApiArraySuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content reports retrieved',
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
  })
  @ApiSuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content report actioned',
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
  @ApiOperation({ summary: 'Dismiss a content report' })
  @ApiSuccessResponse(ContentReportDto, {
    status: HttpStatus.OK,
    description: 'Content report dismissed',
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
  @ApiOperation({ summary: 'List objectionable-content filter keywords' })
  async listKeywords(@CurrentUser() user: JwtPayload) {
    const rows = await this.listFilterKeywords.execute(user.sub);
    return ApiResponseDto.success(rows, 'Filter keywords retrieved');
  }

  @Post('filter-keywords')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a filter keyword' })
  async addKeyword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddFilterKeywordDto,
  ) {
    const row = await this.addFilterKeyword.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Filter keyword added');
  }

  @Delete('filter-keywords/:keywordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a filter keyword' })
  async deactivateKeyword(
    @CurrentUser() user: JwtPayload,
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
  ) {
    const row = await this.deactivateFilterKeyword.execute(
      user.sub,
      keywordId,
    );
    return ApiResponseDto.success(row, 'Filter keyword deactivated');
  }
}
