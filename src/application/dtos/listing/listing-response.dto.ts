import { ApiProperty } from '@nestjs/swagger';
import { ListingEntity } from '../../../domain/entities/listing.entity.js';
import { ListingCondition } from '../../../domain/enums/listing-condition.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../../../domain/enums/delivery-fee-payer.enum.js';

export class ListingSellerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  currentRank: string;

  constructor(seller: { id: string; nickname: string; currentRank: string }) {
    this.id = seller.id;
    this.nickname = seller.nickname;
    this.currentRank = seller.currentRank;
  }
}

export class ListingResponseDto {
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

  @ApiProperty()
  images: string[];

  @ApiProperty({ required: false })
  directTradeLocation?: string;

  @ApiProperty({ required: false })
  isDeliveryAvailable: boolean;

  @ApiProperty({ enum: DeliveryFeePayer, required: false })
  deliveryFeePayer?: DeliveryFeePayer;

  @ApiProperty({ required: false })
  seller?: ListingSellerDto;

  @ApiProperty()
  categoryId: string;

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
    this.images = entity.images;
    this.directTradeLocation = entity.directTradeLocation ?? undefined;
    this.isDeliveryAvailable = entity.isDeliveryAvailable;
    this.deliveryFeePayer = entity.deliveryFeePayer ?? undefined;
    this.categoryId = entity.categoryId;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;

    if (entity.seller) {
      this.seller = new ListingSellerDto(entity.seller);
    }
  }
}
