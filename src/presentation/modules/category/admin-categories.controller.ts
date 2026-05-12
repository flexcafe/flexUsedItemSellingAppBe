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
import { CreateCategoryUseCase } from '../../../application/use-cases/category/create-category.use-case.js';
import { UpdateCategoryUseCase } from '../../../application/use-cases/category/update-category.use-case.js';
import { DeleteCategoryUseCase } from '../../../application/use-cases/category/delete-category.use-case.js';
import { ListCategoriesUseCase } from '../../../application/use-cases/category/list-categories.use-case.js';
import { GetCategoryUseCase } from '../../../application/use-cases/category/get-category.use-case.js';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../../../application/dtos/category/index.js';

@ApiTags('Admin Dashboard Categories')
@Controller(`${ROUTE_PREFIX.adminDashboard}/categories`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create category' })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Category created',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const row = await this.createCategoryUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Category created');
  }

  @Get()
  @ApiOperation({ summary: 'List categories (hierarchical)' })
  @ApiArraySuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,
    description: 'Categories retrieved',
  })
  async list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ApiResponseDto<CategoryResponseDto[]>> {
    const allowInactive = includeInactive !== 'false';
    const rows = await this.listCategoriesUseCase.execute(allowInactive);
    return ApiResponseDto.success(rows, 'Categories retrieved');
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get category detail' })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,
    description: 'Category retrieved',
  })
  async get(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const row = await this.getCategoryUseCase.execute(categoryId);
    return ApiResponseDto.success(row, 'Category retrieved');
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Update category' })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,
    description: 'Category updated',
  })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const row = await this.updateCategoryUseCase.execute(
      user.sub,
      categoryId,
      dto,
    );
    return ApiResponseDto.success(row, 'Category updated');
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<{ deleted: true }>> {
    await this.deleteCategoryUseCase.execute(user.sub, categoryId);
    return ApiResponseDto.success({ deleted: true }, 'Category deleted');
  }
}
