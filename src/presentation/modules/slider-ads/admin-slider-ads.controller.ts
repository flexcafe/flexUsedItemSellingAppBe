import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
  ApiArraySuccessResponse,
  ApiBooleanSuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { CreateSliderAdDto } from '../../../application/dtos/slider-ads/create-slider-ad.dto.js';
import { UpdateSliderAdDto } from '../../../application/dtos/slider-ads/update-slider-ad.dto.js';
import { SliderAdDto } from '../../../application/dtos/slider-ads/slider-ad.dto.js';
import { CreateSliderAdUseCase } from '../../../application/use-cases/slider-ads/create-slider-ad.use-case.js';
import { UpdateSliderAdUseCase } from '../../../application/use-cases/slider-ads/update-slider-ad.use-case.js';
import { DeleteSliderAdUseCase } from '../../../application/use-cases/slider-ads/delete-slider-ad.use-case.js';
import { ListSliderAdsUseCase } from '../../../application/use-cases/slider-ads/list-slider-ads.use-case.js';
import { UploadPublicFileUseCase } from './upload-public-file.use-case.js';

@ApiTags('Admin Slider Ads')
@Controller(`${ROUTE_PREFIX.adminDashboard}/slider-ads`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminSliderAdsController {
  constructor(
    private readonly listSliderAdsUseCase: ListSliderAdsUseCase,
    private readonly createSliderAdUseCase: CreateSliderAdUseCase,
    private readonly updateSliderAdUseCase: UpdateSliderAdUseCase,
    private readonly deleteSliderAdUseCase: DeleteSliderAdUseCase,
    private readonly uploadPublicFileUseCase: UploadPublicFileUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all slider ads (admin)' })
  @ApiArraySuccessResponse(SliderAdDto, {
    status: HttpStatus.OK,
    description: 'Slider ads retrieved',
  })
  async listAll(): Promise<ApiResponseDto<SliderAdDto[]>> {
    const rows = await this.listSliderAdsUseCase.listAll();
    return ApiResponseDto.success(
      rows.map((r) => new SliderAdDto(r)),
      'Slider ads retrieved',
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create slider ad (multipart image upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        linkUrl: { type: 'string', nullable: true },
        status: { type: 'string' },
        sortOrder: { type: 'number' },
        startsAt: { type: 'string', nullable: true },
        endsAt: { type: 'string', nullable: true },
      },
      required: ['file', 'title'],
    },
  })
  @ApiSuccessResponse(SliderAdDto, {
    status: HttpStatus.CREATED,
    description: 'Slider ad created',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or unsupported image type',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSliderAdDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponseDto<SliderAdDto>> {
    const imageUrl = await this.uploadPublicFileUseCase.uploadSliderAdImage(
      user.sub,
      file,
    );
    const entity = await this.createSliderAdUseCase.execute(
      user.sub,
      dto,
      imageUrl,
    );
    return ApiResponseDto.success(new SliderAdDto(entity), 'Slider ad created');
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update slider ad (optionally replace image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        linkUrl: { type: 'string', nullable: true },
        status: { type: 'string' },
        sortOrder: { type: 'number' },
        startsAt: { type: 'string', nullable: true },
        endsAt: { type: 'string', nullable: true },
      },
    },
  })
  @ApiSuccessResponse(SliderAdDto, {
    status: HttpStatus.OK,
    description: 'Slider ad updated',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSliderAdDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponseDto<SliderAdDto>> {
    const imageUrl = file
      ? await this.uploadPublicFileUseCase.uploadSliderAdImage(user.sub, file)
      : undefined;
    const entity = await this.updateSliderAdUseCase.execute(
      user.sub,
      id,
      dto,
      imageUrl,
    );
    return ApiResponseDto.success(new SliderAdDto(entity), 'Slider ad updated');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete slider ad' })
  @ApiBooleanSuccessResponse({
    status: HttpStatus.OK,
    description: 'Slider ad deleted',
  })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<boolean>> {
    const ok = await this.deleteSliderAdUseCase.execute(user.sub, id);
    return ApiResponseDto.success(ok, 'Slider ad deleted');
  }
}
