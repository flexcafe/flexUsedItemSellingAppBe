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
import { FacebookFollowSubmissionDto } from '../../../application/dtos/profile/facebook-follow-submission.dto.js';
import { FacebookFollowFilterDto } from '../../../application/dtos/profile/facebook-follow-filter.dto.js';
import { ReviewFacebookFollowDto } from '../../../application/dtos/profile/review-facebook-follow.dto.js';
import { ListFacebookFollowSubmissionsUseCase } from '../../../application/use-cases/profile/list-facebook-follow-submissions.use-case.js';
import { ReviewFacebookFollowSubmissionUseCase } from '../../../application/use-cases/profile/review-facebook-follow-submission.use-case.js';

@ApiTags('Admin Dashboard Facebook Follow')
@Controller(`${ROUTE_PREFIX.adminDashboard}/facebook-follow`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminFacebookFollowController {
  constructor(
    private readonly listFacebookFollowSubmissionsUseCase: ListFacebookFollowSubmissionsUseCase,
    private readonly reviewFacebookFollowSubmissionUseCase: ReviewFacebookFollowSubmissionUseCase,
  ) {}

  @Get('submissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List Facebook follow submissions for manual review',
  })
  @ApiArraySuccessResponse(FacebookFollowSubmissionDto, {
    status: HttpStatus.OK,
    description: 'Facebook follow submissions retrieved',
  })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: FacebookFollowFilterDto,
  ): Promise<ApiResponseDto<FacebookFollowSubmissionDto[]>> {
    const rows = await this.listFacebookFollowSubmissionsUseCase.execute(
      user.sub,
      query.status,
    );
    return ApiResponseDto.success(
      rows,
      'Facebook follow submissions retrieved',
    );
  }

  @Post('submissions/:submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Approve Facebook follow proof and reward 500 points (one-time per account)',
  })
  @ApiSuccessResponse(FacebookFollowSubmissionDto, {
    status: HttpStatus.OK,
    description: 'Facebook follow submission approved',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Submission is not pending or reward has already been granted previously',
  })
  async approve(
    @CurrentUser() user: JwtPayload,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ReviewFacebookFollowDto,
  ): Promise<ApiResponseDto<FacebookFollowSubmissionDto>> {
    const row = await this.reviewFacebookFollowSubmissionUseCase.approve(
      user.sub,
      submissionId,
      dto,
    );
    return ApiResponseDto.success(row, 'Facebook follow submission approved');
  }

  @Post('submissions/:submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject Facebook follow proof',
  })
  @ApiSuccessResponse(FacebookFollowSubmissionDto, {
    status: HttpStatus.OK,
    description: 'Facebook follow submission rejected',
  })
  async reject(
    @CurrentUser() user: JwtPayload,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ReviewFacebookFollowDto,
  ): Promise<ApiResponseDto<FacebookFollowSubmissionDto>> {
    const row = await this.reviewFacebookFollowSubmissionUseCase.reject(
      user.sub,
      submissionId,
      dto,
    );
    return ApiResponseDto.success(row, 'Facebook follow submission rejected');
  }
}
