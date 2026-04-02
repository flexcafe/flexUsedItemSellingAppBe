import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';

export class UpdateListingDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @ApiProperty({ enum: ListingCondition, required: false })
  @IsEnum(ListingCondition)
  @IsOptional()
  condition?: ListingCondition;

  @ApiProperty({ enum: ListingStatus, required: false })
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @ApiProperty({ enum: PaymentMethod, isArray: true, required: false })
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  @IsOptional()
  paymentMethods?: PaymentMethod[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  directTradeLocation?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  directTradeLatitude?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  directTradeLongitude?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nearbyLandmarks?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  preferredTradeTime?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDeliveryAvailable?: boolean;

  @ApiProperty({ enum: DeliveryFeePayer, required: false })
  @IsEnum(DeliveryFeePayer)
  @IsOptional()
  deliveryFeePayer?: DeliveryFeePayer;

  @ApiProperty({
    required: false,
    description: 'Max 5 image URLs — replaces all existing images',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];
}
