import {
  Body,
  Controller,
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
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { ChangePasswordUseCase } from '../../../application/use-cases/profile/change-password.use-case.js';
import { UploadAvatarUseCase } from '../../../application/use-cases/profile/upload-avatar.use-case.js';
import { ChangePasswordDto } from '../../../application/dtos/profile/change-password.dto.js';
import { UploadAvatarResponseDto } from '../../../application/dtos/profile/upload-avatar-response.dto.js';

@ApiTags('Client Profile')
@Controller(`${ROUTE_PREFIX.client}/profile`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientProfileController {
  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
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
}
