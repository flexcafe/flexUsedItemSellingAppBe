import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ enum: ListingCondition })
  condition: ListingCondition;

  @ApiProperty({ enum: ListingStatus })
  status: ListingStatus;

  @ApiProperty({ enum: PaymentMethod, isArray: true })
  paymentMethods: PaymentMethod[];

  @ApiPropertyOptional({ nullable: true })
  directTradeLocation: string | null;

  @ApiPropertyOptional({ nullable: true })
  directTradeLatitude: number | null;

  @ApiPropertyOptional({ nullable: true })
  directTradeLongitude: number | null;

  @ApiPropertyOptional({ nullable: true })
  mapScreenshotUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  nearbyLandmarks: string | null;

  @ApiPropertyOptional({ nullable: true })
  preferredTradeTime: string | null;

  @ApiProperty()
  isDeliveryAvailable: boolean;

  @ApiPropertyOptional({ enum: DeliveryFeePayer, nullable: true })
  deliveryFeePayer: DeliveryFeePayer | null;

  @ApiProperty({ isArray: true })
  images: string[];

  @ApiProperty()
  sellerId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(entity: ListingEntity) {
    this.id = entity.id;
    this.title = entity.title;
    this.description = entity.description;
    this.price = entity.price;
    this.condition = entity.condition;
    this.status = entity.status;
    this.paymentMethods = entity.paymentMethods;
    this.directTradeLocation = entity.directTradeLocation;
    this.directTradeLatitude = entity.directTradeLatitude;
    this.directTradeLongitude = entity.directTradeLongitude;
    this.mapScreenshotUrl = entity.mapScreenshotUrl;
    this.nearbyLandmarks = entity.nearbyLandmarks;
    this.preferredTradeTime = entity.preferredTradeTime;
    this.isDeliveryAvailable = entity.isDeliveryAvailable;
    this.deliveryFeePayer = entity.deliveryFeePayer;
    this.images = entity.images;
    this.sellerId = entity.sellerId;
    this.categoryId = entity.categoryId;
    this.viewCount = entity.viewCount;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
