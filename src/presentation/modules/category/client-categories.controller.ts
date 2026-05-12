import { Controller, Get, HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiArraySuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { CategoryResponseDto } from '../../../application/dtos/category/index.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { ListCategoriesUseCase } from '../../../application/use-cases/category/list-categories.use-case.js';
import { GetCategoryUseCase } from '../../../application/use-cases/category/get-category.use-case.js';
import { CLIENT_CATEGORY_GET_DOC, CLIENT_CATEGORY_LIST_DOC } from './category.swagger.js';

@ApiTags('Client Categories')
@Controller(`${ROUTE_PREFIX.client}/categories`)
export class ClientCategoriesController {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List active category tree (for pickers & filters)',
    description: CLIENT_CATEGORY_LIST_DOC,
  })
  @ApiArraySuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is CategoryResponseDto[] (roots with active children only).',
  })
  async list(): Promise<ApiResponseDto<CategoryResponseDto[]>> {
    const rows = await this.listCategoriesUseCase.execute(false);
    return ApiResponseDto.success(rows, 'Categories retrieved');
  }

  @Get(':categoryId')
  @ApiOperation({
    summary: 'Get one active category by id',
    description: CLIENT_CATEGORY_GET_DOC,
  })
  @ApiParam({
    name: 'categoryId',
    format: 'uuid',
    description: 'Category id (must be active).',
  })
  @ApiSuccessResponse(CategoryResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is CategoryResponseDto including nested children.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Unknown id or category is inactive.',
  })
  async get(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<CategoryResponseDto>> {
    const row = await this.getCategoryUseCase.execute(categoryId, {
      requireActive: true,
    });
    return ApiResponseDto.success(row, 'Category retrieved');
  }
}
