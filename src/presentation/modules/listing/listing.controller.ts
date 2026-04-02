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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { PaginatedResponseDto } from '../../../application/dtos/common/pagination.dto.js';
import { CreateListingUseCase } from '../../../application/use-cases/listing/create-listing.use-case.js';
import { GetListingUseCase } from '../../../application/use-cases/listing/get-listing.use-case.js';
import { ListListingsUseCase } from '../../../application/use-cases/listing/list-listings.use-case.js';
import { UpdateListingUseCase } from '../../../application/use-cases/listing/update-listing.use-case.js';
import { DeleteListingUseCase } from '../../../application/use-cases/listing/delete-listing.use-case.js';
import { CreateListingDto } from '../../../application/dtos/listing/create-listing.dto.js';
import { UpdateListingDto } from '../../../application/dtos/listing/update-listing.dto.js';
import { ListingResponseDto } from '../../../application/dtos/listing/listing-response.dto.js';
import { ListingFilterDto } from '../../../application/dtos/listing/listing-filter.dto.js';

@Controller('listings')
@ApiTags('Listings')
export class ListingController {
  constructor(
    private readonly createListingUseCase: CreateListingUseCase,
    private readonly getListingUseCase: GetListingUseCase,
    private readonly listListingsUseCase: ListListingsUseCase,
    private readonly updateListingUseCase: UpdateListingUseCase,
    private readonly deleteListingUseCase: DeleteListingUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new listing' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Listing created' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateListingDto,
  ): Promise<ApiResponseDto<ListingResponseDto>> {
    const listing = await this.createListingUseCase.execute(user.sub, dto);
    return ApiResponseDto.success(
      new ListingResponseDto(listing),
      'Listing created successfully',
    );
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse listings with filters and pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Listings retrieved' })
  async findAll(
    @Query() filter: ListingFilterDto,
  ): Promise<ApiResponseDto<PaginatedResponseDto<ListingResponseDto>>> {
    const { listings, total } = await this.listListingsUseCase.execute({
      search: filter.search,
      categoryId: filter.categoryId,
      status: filter.status,
      condition: filter.condition,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
      skip: filter.skip,
      take: filter.limit,
    });

    const items = listings.map((l) => new ListingResponseDto(l));
    const paginated = new PaginatedResponseDto(
      items,
      total,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
    return ApiResponseDto.success(paginated, 'Listings retrieved successfully');
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user listings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User listings retrieved',
  })
  async getMyListings(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<ListingResponseDto[]>> {
    const listings = await this.getListingUseCase.findBySeller(user.sub);
    const items = listings.map((l) => new ListingResponseDto(l));
    return ApiResponseDto.success(
      items,
      'Your listings retrieved successfully',
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single listing by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Listing retrieved' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listing not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<ListingResponseDto>> {
    const listing = await this.getListingUseCase.execute(id);
    return ApiResponseDto.success(
      new ListingResponseDto(listing),
      'Listing retrieved successfully',
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a listing (owner only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Listing updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the owner' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateListingDto,
  ): Promise<ApiResponseDto<ListingResponseDto>> {
    const listing = await this.updateListingUseCase.execute(id, user.sub, dto);
    return ApiResponseDto.success(
      new ListingResponseDto(listing),
      'Listing updated successfully',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a listing (owner only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Listing deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not the owner' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<boolean>> {
    const deleted = await this.deleteListingUseCase.execute(id, user.sub);
    return ApiResponseDto.success(deleted, 'Listing deleted successfully');
  }
}
