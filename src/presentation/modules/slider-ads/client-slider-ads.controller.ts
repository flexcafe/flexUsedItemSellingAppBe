import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ApiArraySuccessResponse } from '../../../common/decorators/api-response.decorator.js';
import { ApiResponseDto } from '../../../application/dtos/common/api-response.dto.js';
import { ROUTE_PREFIX } from '../../routing.paths.js';
import { SliderAdDto } from '../../../application/dtos/slider-ads/slider-ad.dto.js';
import { ListSliderAdsUseCase } from '../../../application/use-cases/slider-ads/list-slider-ads.use-case.js';

@ApiTags('Client Slider Ads')
@Controller(`${ROUTE_PREFIX.client}/slider-ads`)
export class ClientSliderAdsController {
  constructor(private readonly listSliderAdsUseCase: ListSliderAdsUseCase) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active slider ads for client home slider' })
  @ApiArraySuccessResponse(SliderAdDto, {
    status: HttpStatus.OK,
    description: 'Active slider ads retrieved',
  })
  async listActive(): Promise<ApiResponseDto<SliderAdDto[]>> {
    const rows = await this.listSliderAdsUseCase.listActive();
    return ApiResponseDto.success(
      rows.map((r) => new SliderAdDto(r)),
      'Active slider ads retrieved',
    );
  }
}
