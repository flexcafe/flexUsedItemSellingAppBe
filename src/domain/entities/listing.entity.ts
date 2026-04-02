import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ListingStatus } from '../enums/listing-status.enum.js';
import { ListingCondition } from '../enums/listing-condition.enum.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { DeliveryFeePayer } from '../enums/delivery-fee-payer.enum.js';
import { UserEntity } from './user.entity.js';
import { CategoryEntity } from './category.entity.js';

export interface ListingEntityProps {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  status: ListingStatus;
  paymentMethods: PaymentMethod[];
  directTradeLocation: string | null;
  directTradeLatitude: number | null;
  directTradeLongitude: number | null;
  mapScreenshotUrl: string | null;
  nearbyLandmarks: string | null;
  preferredTradeTime: string | null;
  isDeliveryAvailable: boolean;
  deliveryFeePayer: DeliveryFeePayer | null;
  images: string[];
  isDeleted: boolean;
  viewCount: number;
  sellerId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  seller?: UserEntity;
  category?: CategoryEntity;
}

export class ListingEntity {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly condition: ListingCondition;
  readonly status: ListingStatus;
  readonly paymentMethods: PaymentMethod[];
  readonly directTradeLocation: string | null;
  readonly directTradeLatitude: number | null;
  readonly directTradeLongitude: number | null;
  readonly mapScreenshotUrl: string | null;
  readonly nearbyLandmarks: string | null;
  readonly preferredTradeTime: string | null;
  readonly isDeliveryAvailable: boolean;
  readonly deliveryFeePayer: DeliveryFeePayer | null;
  readonly images: string[];
  readonly isDeleted: boolean;
  readonly viewCount: number;
  readonly sellerId: string;
  readonly categoryId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly seller?: UserEntity;
  readonly category?: CategoryEntity;

  constructor(props: ListingEntityProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.price = props.price;
    this.condition = props.condition;
    this.status = props.status;
    this.paymentMethods = props.paymentMethods;
    this.directTradeLocation = props.directTradeLocation;
    this.directTradeLatitude = props.directTradeLatitude;
    this.directTradeLongitude = props.directTradeLongitude;
    this.mapScreenshotUrl = props.mapScreenshotUrl;
    this.nearbyLandmarks = props.nearbyLandmarks;
    this.preferredTradeTime = props.preferredTradeTime;
    this.isDeliveryAvailable = props.isDeliveryAvailable;
    this.deliveryFeePayer = props.deliveryFeePayer;
    this.images = props.images;
    this.isDeleted = props.isDeleted;
    this.viewCount = props.viewCount;
    this.sellerId = props.sellerId;
    this.categoryId = props.categoryId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.seller = props.seller;
    this.category = props.category;
  }

  isOwnedBy(userId: string): boolean {
    return this.sellerId === userId;
  }

  assertOwnership(userId: string): void {
    if (!this.isOwnedBy(userId)) {
      throw new ForbiddenException('You can only modify your own listings');
    }
  }

  canBeModified(): boolean {
    return !this.isDeleted && this.status !== ListingStatus.SOLD;
  }

  assertCanBeModified(): void {
    if (!this.canBeModified()) {
      throw new BadRequestException('This listing cannot be modified');
    }
  }

  canBePublished(): boolean {
    return this.status === ListingStatus.DRAFT && !this.isDeleted;
  }

  canBeSold(): boolean {
    return this.status === ListingStatus.ACTIVE && !this.isDeleted;
  }

  canBeArchived(): boolean {
    return (
      (this.status === ListingStatus.ACTIVE ||
        this.status === ListingStatus.SOLD) &&
      !this.isDeleted
    );
  }
}
