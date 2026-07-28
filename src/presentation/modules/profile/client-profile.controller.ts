import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiErrorResponse,
  ApiBooleanSuccessResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { AllowVpn } from '../../../common/decorators/allow-vpn.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { ChangePasswordUseCase } from '../../../application/use-cases/profile/change-password.use-case.js';
import { DeleteAccountUseCase } from '../../../application/use-cases/profile/delete-account.use-case.js';
import { UploadAvatarUseCase } from '../../../application/use-cases/profile/upload-avatar.use-case.js';
import { LinkFacebookUseCase } from '../../../application/use-cases/profile/link-facebook.use-case.js';
import { SubmitFacebookFollowUseCase } from '../../../application/use-cases/profile/submit-facebook-follow.use-case.js';
import { GetMyFacebookFollowSubmissionUseCase } from '../../../application/use-cases/profile/get-my-facebook-follow-submission.use-case.js';
import { ChangePasswordDto } from '../../../application/dtos/profile/change-password.dto.js';
import {
  DeleteAccountDto,
  DeleteAccountResultDto,
} from '../../../application/dtos/profile/delete-account.dto.js';
import { LinkFacebookDto } from '../../../application/dtos/profile/link-facebook.dto.js';
import { SubmitFacebookFollowDto } from '../../../application/dtos/profile/submit-facebook-follow.dto.js';
import { FacebookFollowSubmissionDto } from '../../../application/dtos/profile/facebook-follow-submission.dto.js';
import { UploadAvatarResponseDto } from '../../../application/dtos/profile/upload-avatar-response.dto.js';

@ApiTags('Client Profile')
@Controller(`${ROUTE_PREFIX.client}/profile`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientProfileController {
  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly linkFacebookUseCase: LinkFacebookUseCase,
    private readonly submitFacebookFollowUseCase: SubmitFacebookFollowUseCase,
    private readonly getMyFacebookFollowSubmissionUseCase: GetMyFacebookFollowSubmissionUseCase,
  ) {}

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBooleanSuccessResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failure (password mismatch)',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password incorrect',
  })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponseDto<boolean>> {
    await this.changePasswordUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(true, 'Password changed successfully');
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete my account',
    description:
      'App Store Guideline 5.1.1(v). Permanently deletes the account (not a temporary deactivate): ' +
      'anonymizes personal data, soft-deletes listings, closes chat rooms, revokes sessions, ' +
      'and frees phone/email for re-registration. Historical transactions/reviews/reports are retained without PII. ' +
      'Requires current password and confirm=DELETE.',
  })
  @ApiSuccessResponse(DeleteAccountResultDto, {
    status: HttpStatus.OK,
    description: 'Account permanently deleted',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'confirm is not exactly DELETE',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing JWT or current password incorrect',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin accounts cannot self-delete via client API',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Account is already deleted',
  })
  async deleteAccount(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeleteAccountDto,
  ): Promise<ApiResponseDto<DeleteAccountResultDto>> {
    const result = await this.deleteAccountUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(result, 'Account permanently deleted');
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload or replace profile avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiSuccessResponse(UploadAvatarResponseDto, {
    status: HttpStatus.OK,
    description: 'Avatar uploaded successfully',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Unsupported file type or missing file',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponseDto<UploadAvatarResponseDto>> {
    const avatarUrl = await this.uploadAvatarUseCase.execute(user.sub, {
      originalName: file?.originalname ?? 'avatar',
      mimeType: file?.mimetype ?? '',
      body: file?.buffer ?? Buffer.from([]),
    });
    return ApiResponseDto.success(
      new UploadAvatarResponseDto(avatarUrl),
      'Avatar uploaded successfully',
    );
  }

  @AllowVpn()
  @Post('facebook/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Link Facebook account using verified Facebook access token (VPN allowed only for this endpoint)',
  })
  @ApiBooleanSuccessResponse({
    status: HttpStatus.OK,
    description: 'Facebook linked successfully',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid Facebook access token',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'Facebook account already linked by another user',
  })
  async linkFacebook(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LinkFacebookDto,
  ): Promise<ApiResponseDto<boolean>> {
    await this.linkFacebookUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(true, 'Facebook linked successfully');
  }

  @AllowVpn()
  @Post('facebook/follow-submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit Facebook follow proof for manual admin review (VPN allowed)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        facebookName: { type: 'string' },
        facebookProfileUrl: { type: 'string' },
        facebookPageUrl: { type: 'string' },
        screenshot: { type: 'string', format: 'binary' },
      },
      required: [
        'facebookName',
        'facebookProfileUrl',
        'facebookPageUrl',
        'screenshot',
      ],
    },
  })
  @ApiSuccessResponse(FacebookFollowSubmissionDto, {
    status: HttpStatus.CREATED,
    description: 'Facebook follow submission created',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'A follow submission is already pending review',
  })
  @UseInterceptors(
    FileInterceptor('screenshot', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async submitFacebookFollow(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitFacebookFollowDto,
    @UploadedFile() screenshot?: Express.Multer.File,
  ): Promise<ApiResponseDto<FacebookFollowSubmissionDto>> {
    const row = await this.submitFacebookFollowUseCase.execute(user.sub, dto, {
      originalName: screenshot?.originalname ?? 'follow-screenshot',
      mimeType: screenshot?.mimetype ?? '',
      body: screenshot?.buffer ?? Buffer.from([]),
    });
    return ApiResponseDto.success(
      row,
      'Facebook follow submission created successfully',
    );
  }

  @AllowVpn()
  @Get('facebook/follow-submissions/latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get latest Facebook follow submission status (VPN allowed for follow-check endpoint)',
  })
  @ApiSuccessResponse(FacebookFollowSubmissionDto, {
    status: HttpStatus.OK,
    description: 'Latest Facebook follow submission status retrieved',
  })
  async getLatestFacebookFollowSubmission(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<FacebookFollowSubmissionDto | null>> {
    const row = await this.getMyFacebookFollowSubmissionUseCase.execute(
      user.sub,
    );
    return ApiResponseDto.success(
      row,
      'Latest Facebook follow submission retrieved',
    );
  }
}
