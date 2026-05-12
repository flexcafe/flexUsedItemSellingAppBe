import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['price'] as const),
) {
  @ApiPropertyOptional({
    enum: ListingStatus,
    description:
      'Optional listing lifecycle status. Only send values your product rules allow; invalid transitions may be rejected elsewhere.',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
