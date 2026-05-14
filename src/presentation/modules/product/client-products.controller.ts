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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import {
  ApiErrorResponse,
  ApiPaginatedSuccessResponse,
  ApiSuccessResponse,
} from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { DeleteProductDto } from '../../../application/dtos/product/delete-product.dto.js';
import {
  CreateProductDto,
  MyProductsFilterDto,
  ProductDeleteResponseDto,
  ProductFilterDto,
  ProductResponseDto,
  UpdateProductDto,
} from '../../../application/dtos/product/index.js';
import { PaginatedResponseDto } from '../../../application/dtos/common/index.js';
import { CreateProductUseCase } from '../../../application/use-cases/product/create-product.use-case.js';
import { ListProductsUseCase } from '../../../application/use-cases/product/list-products.use-case.js';
import { GetProductDetailUseCase } from '../../../application/use-cases/product/get-product-detail.use-case.js';
import { GetMyProductDetailUseCase } from '../../../application/use-cases/product/get-my-product-detail.use-case.js';
import { ListMyProductsUseCase } from '../../../application/use-cases/product/list-my-products.use-case.js';
import { UpdateProductUseCase } from '../../../application/use-cases/product/update-product.use-case.js';
import { DeleteProductUseCase } from '../../../application/use-cases/product/delete-product.use-case.js';
import { UploadProductMediaUseCase } from '../../../application/use-cases/product/upload-product-media.use-case.js';
import {
  CLIENT_PRODUCT_CREATE_DOC,
  CLIENT_PRODUCT_DELETE_DOC,
  CLIENT_PRODUCT_GET_DOC,
  CLIENT_PRODUCT_LIST_DOC,
  CLIENT_PRODUCT_LIST_MINE_DOC,
  CLIENT_PRODUCT_GET_MINE_DOC,
  CLIENT_PRODUCT_UPDATE_DOC,
} from './product.swagger.js';

@ApiTags('Client Products')
@Controller(`${ROUTE_PREFIX.client}/products`)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ClientProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly getMyProductDetailUseCase: GetMyProductDetailUseCase,
    private readonly listMyProductsUseCase: ListMyProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly uploadProductMediaUseCase: UploadProductMediaUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional product photos uploaded directly from FE.',
        },
        mapScreenshot: {
          type: 'string',
          format: 'binary',
          description:
            'Optional map screenshot image uploaded directly from FE.',
        },
        categoryId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        condition: { type: 'string' },
        paymentMethods: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string' },
          ],
        },
        directTradeLocation: { type: 'string' },
        directTradeLatitude: { type: 'number' },
        directTradeLongitude: { type: 'number' },
        mapScreenshotUrl: { type: 'string' },
        nearbyLandmarks: { type: 'string' },
        preferredTradeTime: { type: 'string' },
        isDeliveryAvailable: { type: 'boolean' },
        deliveryFeePayer: { type: 'string' },
        preferredLocations: {
          oneOf: [
            { type: 'array', items: { type: 'object' } },
            {
              type: 'string',
              description: 'JSON string array for multipart submissions.',
            },
          ],
        },
      },
      required: [
        'categoryId',
        'title',
        'description',
        'price',
        'paymentMethods',
        'isDeliveryAvailable',
      ],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 5 },
        { name: 'mapScreenshot', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 4 * 1024 * 1024,
          files: 6,
        },
        fileFilter: (_req, file, cb) => {
          const allowed = ['image/png', 'image/jpeg', 'image/webp'];
          cb(null, allowed.includes(file.mimetype));
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Create a product listing (seller = current user)',
    description: CLIENT_PRODUCT_CREATE_DOC,
  })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.CREATED,
    description:
      'Wrapped in ApiResponseDto; data is ProductResponseDto for the new ACTIVE listing.',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation failed (DTO/class-validator) or business rule rejection (blank text, image/limit, payment/delivery rules, lat/lng pair, duplicates).',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found, or active category not found for categoryId.',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      mapScreenshot?: Express.Multer.File[];
    },
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const uploadedImageUrls =
      await this.uploadProductMediaUseCase.uploadListingImages(
        user.sub,
        files?.images,
      );
    const uploadedMapScreenshotUrl =
      await this.uploadProductMediaUseCase.uploadMapScreenshot(
        user.sub,
        files?.mapScreenshot?.[0],
      );
    dto.images = [...(dto.images ?? []), ...uploadedImageUrls];
    if (uploadedMapScreenshotUrl) {
      dto.mapScreenshotUrl = uploadedMapScreenshotUrl;
    }
    try {
      const row = await this.createProductUseCase.execute(user.sub, dto);
      return ApiResponseDto.success(row, 'Product created');
    } catch (err) {
      await this.uploadProductMediaUseCase.revertUploadedPublicUrls([
        ...uploadedImageUrls,
        ...(uploadedMapScreenshotUrl ? [uploadedMapScreenshotUrl] : []),
      ]);
      throw err;
    }
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Search / list public product catalog (paginated)',
    description: CLIENT_PRODUCT_LIST_DOC,
  })
  @ApiPaginatedSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is PaginatedResponseDto with items: ProductResponseDto[].',
  })
  async list(
    @Query() query: ProductFilterDto,
  ): Promise<ApiResponseDto<PaginatedResponseDto<ProductResponseDto>>> {
    const rows = await this.listProductsUseCase.execute(query);
    return ApiResponseDto.success(rows, 'Products retrieved');
  }

  @Get('my')
  @ApiOperation({
    summary: 'List my product listings (paginated, auth)',
    description: CLIENT_PRODUCT_LIST_MINE_DOC,
  })
  @ApiPaginatedSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is PaginatedResponseDto of the current user’s non-deleted listings.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT.',
  })
  async listMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: MyProductsFilterDto,
  ): Promise<ApiResponseDto<PaginatedResponseDto<ProductResponseDto>>> {
    const rows = await this.listMyProductsUseCase.execute(user.sub, query);
    return ApiResponseDto.success(rows, 'My products retrieved');
  }

  @Get('my/:productId')
  @ApiOperation({
    summary: 'Get one of my listings by id (seller detail)',
    description: CLIENT_PRODUCT_GET_MINE_DOC,
  })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'Listing id that must belong to the current user.',
  })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is ProductResponseDto (same shape as public detail).',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No listing with this id for the current seller.',
  })
  async getMine(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const row = await this.getMyProductDetailUseCase.execute(
      user.sub,
      productId,
    );
    return ApiResponseDto.success(row, 'My product detail retrieved');
  }

  @Public()
  @Get(':productId')
  @ApiOperation({
    summary: 'Get one product by id (public)',
    description: CLIENT_PRODUCT_GET_DOC,
  })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'Listing id (same as legacy “listing” primary key).',
  })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is ProductResponseDto including images URLs and sellerId.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'Listing does not exist or is soft-deleted / not visible to this endpoint.',
  })
  async getOne(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const row = await this.getProductDetailUseCase.execute(productId);
    return ApiResponseDto.success(row, 'Product detail retrieved');
  }

  @Patch(':productId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional replacement product photos (max 5).',
        },
        mapScreenshot: {
          type: 'string',
          format: 'binary',
          description:
            'Optional replacement map screenshot; overwrites mapScreenshotUrl.',
        },
        categoryId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        condition: { type: 'string' },
        status: { type: 'string' },
        paymentMethods: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string' },
          ],
        },
        directTradeLocation: { type: 'string' },
        directTradeLatitude: { type: 'number' },
        directTradeLongitude: { type: 'number' },
        mapScreenshotUrl: { type: 'string' },
        nearbyLandmarks: { type: 'string' },
        preferredTradeTime: { type: 'string' },
        isDeliveryAvailable: { type: 'boolean' },
        deliveryFeePayer: { type: 'string' },
        preferredLocations: {
          oneOf: [
            { type: 'array', items: { type: 'object' } },
            {
              type: 'string',
              description: 'JSON string array for multipart submissions.',
            },
          ],
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 5 },
        { name: 'mapScreenshot', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 4 * 1024 * 1024,
          files: 6,
        },
        fileFilter: (_req, file, cb) => {
          const allowed = ['image/png', 'image/jpeg', 'image/webp'];
          cb(null, allowed.includes(file.mimetype));
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Update own product (partial body)',
    description: CLIENT_PRODUCT_UPDATE_DOC,
  })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'Listing id owned by the current user.',
  })
  @ApiSuccessResponse(ProductResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is the updated ProductResponseDto.',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation or business rule failure on provided fields.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Authenticated user is not the seller of this listing.',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found, deleted, or failed atomic update (race).',
  })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      mapScreenshot?: Express.Multer.File[];
    },
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    const newImageUrls = files?.images?.length
      ? await this.uploadProductMediaUseCase.uploadListingImages(
          user.sub,
          files.images,
        )
      : [];
    let newMapScreenshotUrl: string | null = null;
    if (files?.images?.length) {
      dto.images = newImageUrls;
    }
    if (files?.mapScreenshot?.[0]) {
      newMapScreenshotUrl =
        await this.uploadProductMediaUseCase.uploadMapScreenshot(
          user.sub,
          files.mapScreenshot[0],
        );
      if (newMapScreenshotUrl) {
        dto.mapScreenshotUrl = newMapScreenshotUrl;
      }
    }
    try {
      const row = await this.updateProductUseCase.execute(
        user.sub,
        productId,
        dto,
      );
      return ApiResponseDto.success(row, 'Product updated');
    } catch (err) {
      await this.uploadProductMediaUseCase.revertUploadedPublicUrls([
        ...newImageUrls,
        ...(newMapScreenshotUrl ? [newMapScreenshotUrl] : []),
      ]);
      throw err;
    }
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete own product (confirmation body)',
    description: CLIENT_PRODUCT_DELETE_DOC,
  })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'Listing id to archive/delete (seller-only).',
  })
  @ApiSuccessResponse(ProductDeleteResponseDto, {
    status: HttpStatus.OK,
    description:
      'Wrapped in ApiResponseDto; data is { deleted: true } when delete succeeded.',
  })
  @ApiErrorResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT.',
  })
  @ApiErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation failed on DeleteProductDto, or confirmation title does not match listing title.',
  })
  @ApiErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Authenticated user is not the seller of this listing.',
  })
  @ApiErrorResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Listing is sold; sellers cannot delete it (support may assist).',
  })
  @ApiErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'Listing not found, already removed, or concurrent delete (atomic update matched 0 rows).',
  })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: DeleteProductDto,
  ): Promise<ApiResponseDto<ProductDeleteResponseDto>> {
    await this.deleteProductUseCase.execute(user.sub, productId, dto);
    return ApiResponseDto.success({ deleted: true }, 'Product deleted');
  }
}
