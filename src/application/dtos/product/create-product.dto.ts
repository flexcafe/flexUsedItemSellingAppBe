import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';
import { ProductPreferredLocationDto } from './product-preferred-location.dto.js';

export class CreateProductDto {
  @ApiProperty({
    description:
      'Must reference an **active** category UUID from your app’s category catalog (typically loaded from the admin-managed hierarchy and cached on the client). Inactive or unknown categories are rejected with 404 from the use-case layer.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    example: 'iPhone 13 Pro Max 256GB',
    description:
      'Non-empty after trim. Shown in catalog cards and detail. Max length enforced by validator.',
  })
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiProperty({
    example: 'No error, battery 87%, box included.',
    description:
      'Non-empty after trim. Full description on detail page; may match search substring.',
  })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 980000 })
  @Type(() => Number)
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
    description:
      'At least one method. Max two entries, no duplicates. Values: CASH, KBZPAY.',
  })
  @Transform(({ value }) => parseEnumArrayValue(value))
  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods: PaymentMethod[];

  @ApiPropertyOptional({
    example: 'Pabedan Township',
    description:
      'Human-readable direct trade area. If sent, cannot be whitespace-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  directTradeLocation?: string;

  @ApiPropertyOptional({
    example: 16.778,
    description:
      'WGS84 latitude of direct trade pin. Must be paired with directTradeLongitude; drives PostGIS geo_location for nearest-first search.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  directTradeLatitude?: number;

  @ApiPropertyOptional({
    example: 96.162,
    description:
      'WGS84 longitude of direct trade pin. Must be paired with directTradeLatitude.',
  })
  @IsOptional()
  @Type(() => Number)
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
  @Transform(({ value }) => parseBooleanValue(value))
  @IsBoolean()
  isDeliveryAvailable: boolean;

  @ApiPropertyOptional({
    enum: DeliveryFeePayer,
    description:
      'Who pays delivery when `isDeliveryAvailable` is true: **BUYER** or **SELLER**. Required in that case. Omit when delivery is disabled.',
  })
  @ValidateIf((o: CreateProductDto) => o.isDeliveryAvailable === true)
  @IsNotEmpty({
    message: 'deliveryFeePayer is required when delivery is available',
  })
  @IsEnum(DeliveryFeePayer)
  deliveryFeePayer?: DeliveryFeePayer;

  @ApiProperty({
    isArray: true,
    example: ['https://cdn.example.com/p1.jpg'],
    description:
      'Optional fallback URLs. For multipart create/update, upload binary files in `images` field and server stores them in Supabase.',
  })
  @Transform(({ value }) => parseStringArrayValue(value))
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    type: ProductPreferredLocationDto,
    isArray: true,
    description:
      'Up to 3 alternate meetup options (label + address; optional per-row lat/lng). Each label and address must be non-blank after trim.',
  })
  @Transform(({ value }) => parsePreferredLocationsValue(value))
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ProductPreferredLocationDto)
  preferredLocations?: ProductPreferredLocationDto[];
}

function parseBooleanValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return value;
}

function parseStringArrayValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value;
}

function parseEnumArrayValue(value: unknown): unknown {
  return parseStringArrayValue(value);
}

function parsePreferredLocationsValue(value: unknown): unknown {
  if (Array.isArray(value) || typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return parsed;
  } catch {
    return value;
  }
}
