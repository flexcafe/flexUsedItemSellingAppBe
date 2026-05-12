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
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ApiSuccessResponse } from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import {
  CreateProductDto,
  MyProductsFilterDto,
  ProductFilterDto,
  ProductResponseDto,
  UpdateProductDto,
} from '../../../application/dtos/product/index.js';
import { PaginatedResponseDto } from '../../../application/dtos/common/index.js';
import { CreateProductUseCase } from '../../../application/use-cases/product/create-product.use-case.js';
import { ListProductsUseCase } from '../../../application/use-cases/product/list-products.use-case.js';
import { GetProductDetailUseCase } from '../../../application/use-cases/product/get-product-detail.use-case.js';
import { ListMyProductsUseCase } from '../../../application/use-cases/product/list-my-products.use-case.js';
import { UpdateProductUseCase } from '../../../application/use-cases/product/update-product.use-case.js';
import { DeleteProductUseCase } from '../../../application/use-cases/product/delete-product.use-case.js';

@ApiTags('Client Products')
@Controller(`${ROUTE_PREFIX.client}/products`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly listMyProductsUseCase: ListMyProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product listing' })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Product created',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const row = await this.createProductUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(row, 'Product created');
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search/list products' })
  @ApiSuccessResponse(PaginatedResponseDto<ProductResponseDto>, {
    status: HttpStatus.OK,
    description: 'Products retrieved',
  })
  async list(
    @Query() query: ProductFilterDto,
  ): Promise<ApiResponseDto<PaginatedResponseDto<ProductResponseDto>>> {
    const rows = await this.listProductsUseCase.execute(query);
    return ApiResponseDto.success(rows, 'Products retrieved');
  }

  @Get('my')
  @ApiOperation({ summary: 'List current user products' })
  @ApiSuccessResponse(PaginatedResponseDto<ProductResponseDto>, {
    status: HttpStatus.OK,
    description: 'My products retrieved',
  })
  async listMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: MyProductsFilterDto,
  ): Promise<ApiResponseDto<PaginatedResponseDto<ProductResponseDto>>> {
    const rows = await this.listMyProductsUseCase.execute(user.sub, query);
    return ApiResponseDto.success(rows, 'My products retrieved');
  }

  @Public()
  @Get(':productId')
  @ApiOperation({ summary: 'Get product detail' })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description: 'Product detail retrieved',
  })
  async getOne(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const row = await this.getProductDetailUseCase.execute(productId);
    return ApiResponseDto.success(row, 'Product detail retrieved');
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Update own product listing' })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description: 'Product updated',
  })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const row = await this.updateProductUseCase.execute(
      user.sub,
      productId,
      dto,
    );
    return ApiResponseDto.success(row, 'Product updated');
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own product listing' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ApiResponseDto<{ deleted: true }>> {
    await this.deleteProductUseCase.execute(user.sub, productId);
    return ApiResponseDto.success({ deleted: true }, 'Product deleted');
  }
}
