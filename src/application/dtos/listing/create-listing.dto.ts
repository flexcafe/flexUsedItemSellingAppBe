import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';

export class CreateListingDto {
  @ApiProperty({ example: 'iPhone 14 Pro Max - Mint Condition' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Barely used, comes with original box and charger.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 899.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ enum: ListingCondition, example: ListingCondition.LIKE_NEW })
  @IsEnum(ListingCondition)
  condition: ListingCondition;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    enum: PaymentMethod,
    isArray: true,
    example: [PaymentMethod.CASH],
  })
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods: PaymentMethod[];

  @ApiProperty({ example: 'Pabedan Township, Yangon', required: false })
  @IsString()
  @IsOptional()
  directTradeLocation?: string;

  @ApiProperty({ example: 16.8661, required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  directTradeLatitude?: number;

  @ApiProperty({ example: 96.1951, required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  directTradeLongitude?: number;

  @ApiProperty({ example: 'Near Sule Pagoda', required: false })
  @IsString()
  @IsOptional()
  nearbyLandmarks?: string;

  @ApiProperty({ example: 'Weekdays 5PM-8PM', required: false })
  @IsString()
  @IsOptional()
  preferredTradeTime?: string;

  @ApiProperty({
    example: 'https://storage.example.com/map.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  mapScreenshotUrl?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDeliveryAvailable?: boolean;

  @ApiProperty({ enum: DeliveryFeePayer, required: false })
  @IsEnum(DeliveryFeePayer)
  @IsOptional()
  deliveryFeePayer?: DeliveryFeePayer;

  @ApiProperty({
    example: ['https://storage.example.com/img1.jpg'],
    required: false,
    description: 'Max 5 image URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @Max(5, { each: false })
  @IsOptional()
  imageUrls?: string[];
}
