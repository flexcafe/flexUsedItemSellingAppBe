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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

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

import { CreateCategoryUseCase } from '../../../application/use-cases/category/create-category.use-case.js';

import { UpdateCategoryUseCase } from '../../../application/use-cases/category/update-category.use-case.js';

import { DeleteCategoryUseCase } from '../../../application/use-cases/category/delete-category.use-case.js';

import { ListCategoriesUseCase } from '../../../application/use-cases/category/list-categories.use-case.js';

import { GetCategoryUseCase } from '../../../application/use-cases/category/get-category.use-case.js';

import { UploadCategoryIconUseCase } from '../../../application/use-cases/category/upload-category-icon.use-case.js';

import {
  CategoryDeleteResponseDto,
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../../../application/dtos/category/index.js';

import {
  ADMIN_CATEGORY_CREATE_DOC,
  ADMIN_CATEGORY_DELETE_DOC,
  ADMIN_CATEGORY_GET_DOC,
  ADMIN_CATEGORY_LIST_DOC,
  ADMIN_CATEGORY_UPDATE_DOC,
} from './category.swagger.js';

@ApiTags('Admin Dashboard Categories')
@Controller(`${ROUTE_PREFIX.adminDashboard}/categories`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AdminCategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,

    private readonly updateCategoryUseCase: UpdateCategoryUseCase,

    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,

    private readonly listCategoriesUseCase: ListCategoriesUseCase,

    private readonly getCategoryUseCase: GetCategoryUseCase,

    private readonly uploadCategoryIconUseCase: UploadCategoryIconUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: {
          type: 'string',
          format: 'binary',
          description:
            'Optional. PNG, JPEG, WebP, or SVG. Uploaded to Supabase; public URL stored on the category.',
        },
        name: { type: 'string' },
        slug: { type: 'string' },
        sortOrder: { type: 'integer' },
        parentId: { type: 'string', format: 'uuid' },
      },
      required: ['name'],
    },
  })
  @ApiOperation({
    summary: 'Create a category (multipart; optional icon file)',

    description: ADMIN_CATEGORY_CREATE_DOC,
  })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.CREATED,

    description:
      'Wrapped in ApiResponseDto; data is the new CategoryResponseDto (with nested children array, usually empty on create).',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,

    description:
      'Validation failed, unsupported icon type, or missing multipart fields.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,

    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,

    description: 'Authenticated user is not an admin.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,

    description: 'parentId references a category that does not exist.',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,

    description: 'Slug already exists or other conflict from use-case rules.',
  })
  @UseInterceptors(
    FileInterceptor('icon', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/svg+xml',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async create(
    @CurrentUser() user: JwtPayload,

    @Body() dto: CreateCategoryDto,

    @UploadedFile() iconFile?: Express.Multer.File,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const iconUrl = await this.uploadCategoryIconUseCase.execute(
      user.sub,
      iconFile,
    );
    const row = await this.createCategoryUseCase.execute(
      user.sub,
      dto,
      iconUrl,
    );

    return ApiResponseDto.success(row, 'Category created');
  }

  @Get()
  @ApiOperation({
    summary: 'List categories as a tree (roots with nested children)',

    description: ADMIN_CATEGORY_LIST_DOC,
  })
  @ApiQuery({
    name: 'includeInactive',

    required: false,

    description:
      'If the literal string `false` is passed, inactive categories are omitted from roots and children. Any other value (or omitting the param) includes inactive rows.',

    example: 'false',
  })
  @ApiArraySuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,

    description:
      'Wrapped in ApiResponseDto; data is CategoryResponseDto[] (tree: each root includes children[]).',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,

    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,

    description: 'Authenticated user is not an admin.',
  })
  async list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ApiResponseDto<CategoryResponseDto[]>> {
    const allowInactive = includeInactive !== 'false';

    const rows = await this.listCategoriesUseCase.execute(allowInactive);

    return ApiResponseDto.success(rows, 'Categories retrieved');
  }

  @Get(':categoryId')
  @ApiOperation({
    summary: 'Get one category by id',

    description: ADMIN_CATEGORY_GET_DOC,
  })
  @ApiParam({
    name: 'categoryId',

    format: 'uuid',

    description: 'Primary key of the category row.',
  })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,

    description:
      'Wrapped in ApiResponseDto; data is CategoryResponseDto for that id.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,

    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,

    description: 'Authenticated user is not an admin.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,

    description: 'No category with this id.',
  })
  async get(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const row = await this.getCategoryUseCase.execute(categoryId);

    return ApiResponseDto.success(row, 'Category retrieved');
  }

  @Patch(':categoryId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: {
          type: 'string',
          format: 'binary',
          description:
            'Optional. When sent, replaces stored icon URL after upload to Supabase.',
        },
        name: { type: 'string' },
        slug: { type: 'string' },
        sortOrder: { type: 'integer' },
        parentId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOperation({
    summary: 'Update a category (multipart; optional new icon file)',

    description: ADMIN_CATEGORY_UPDATE_DOC,
  })
  @ApiParam({
    name: 'categoryId',

    format: 'uuid',

    description: 'Category to update.',
  })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,

    description:
      'Wrapped in ApiResponseDto; data is the updated CategoryResponseDto.',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,

    description: 'Validation failed on UpdateCategoryDto or unsupported icon.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,

    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,

    description: 'Authenticated user is not an admin.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,

    description: 'Category or new parent not found.',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,

    description:
      'Slug collision, self-parent, hierarchy cycle, or other business rule violation.',
  })
  @UseInterceptors(
    FileInterceptor('icon', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/svg+xml',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async update(
    @CurrentUser() user: JwtPayload,

    @Param('categoryId', ParseUUIDPipe) categoryId: string,

    @Body() dto: UpdateCategoryDto,

    @UploadedFile() iconFile?: Express.Multer.File,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const iconUrl = iconFile
      ? await this.uploadCategoryIconUseCase.execute(user.sub, iconFile)
      : undefined;
    const row = await this.updateCategoryUseCase.execute(
      user.sub,

      categoryId,

      dto,
      iconUrl,
    );

    return ApiResponseDto.success(row, 'Category updated');
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete (deactivate) a category',

    description: ADMIN_CATEGORY_DELETE_DOC,
  })
  @ApiParam({
    name: 'categoryId',

    format: 'uuid',

    description: 'Category to deactivate.',
  })
  @ApiSuccessResponse(CategoryDeleteResponseDto, {
    status: HttpStatus.OK,

    description:
      'Wrapped in ApiResponseDto; data is { deleted: true } when the soft-delete succeeded.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,

    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,

    description: 'Authenticated user is not an admin.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,

    description: 'Category id does not exist.',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,

    description:
      'Category still has child categories or is referenced by non-deleted listings.',
  })
  async remove(
    @CurrentUser() user: JwtPayload,

    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<CategoryDeleteResponseDto>> {
    await this.deleteCategoryUseCase.execute(user.sub, categoryId);

    return ApiResponseDto.success({ deleted: true }, 'Category deleted');
  }
}
