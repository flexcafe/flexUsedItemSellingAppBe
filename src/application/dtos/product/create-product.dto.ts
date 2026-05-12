import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';
import { ProductPreferredLocationDto } from './product-preferred-location.dto.js';

export class CreateProductDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'iPhone 13 Pro Max 256GB' })
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiProperty({ example: 'No error, battery 87%, box included.' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 980000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    enum: ListingCondition,
    default: ListingCondition.GOOD,
  })
  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @ApiProperty({
    enum: PaymentMethod,
    isArray: true,
    example: [PaymentMethod.CASH, PaymentMethod.KBZPAY],
  })
  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods: PaymentMethod[];

  @ApiPropertyOptional({ example: 'Pabedan Township' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  directTradeLocation?: string;

  @ApiPropertyOptional({ example: 16.778 })
  @IsOptional()
  @IsNumber()
  directTradeLatitude?: number;

  @ApiPropertyOptional({ example: 96.162 })
  @IsOptional()
  @IsNumber()
  directTradeLongitude?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/map-shot.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapScreenshotUrl?: string;

  @ApiPropertyOptional({ example: 'Near Sule Pagoda traffic light.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nearbyLandmarks?: string;

  @ApiPropertyOptional({ example: 'After 6 PM weekdays' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredTradeTime?: string;

  @ApiProperty()
  @IsBoolean()
  isDeliveryAvailable: boolean;

  @ApiPropertyOptional({ enum: DeliveryFeePayer, nullable: true })
  @IsOptional()
  @IsEnum(DeliveryFeePayer)
  deliveryFeePayer?: DeliveryFeePayer;

  @ApiProperty({ isArray: true, example: ['https://cdn.example.com/p1.jpg'] })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ type: ProductPreferredLocationDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ProductPreferredLocationDto)
  preferredLocations: ProductPreferredLocationDto[];
}
