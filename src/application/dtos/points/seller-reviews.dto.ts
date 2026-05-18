import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ReviewStarCountData,
  SellerReviewListItemData,
  SellerReviewsResultData,
} from '../../../domain/repositories/points.repository.interface.js';

export class ReviewStarCountDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  stars: number;

  @ApiProperty({ example: 6 })
  count: number;

  constructor(data: ReviewStarCountData) {
    this.stars = data.stars;
    this.count = data.count;
  }
}

export class SellerReviewItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  stars: number;

  @ApiPropertyOptional({ nullable: true })
  comment: string | null;

  @ApiProperty()
  reviewerNickname: string;

  @ApiPropertyOptional({ nullable: true })
  reviewerAvatar: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(data: SellerReviewListItemData) {
    this.id = data.id;
    this.stars = data.stars;
    this.comment = data.comment;
    this.reviewerNickname = data.reviewerNickname;
    this.reviewerAvatar = data.reviewerAvatar;
    this.createdAt = data.createdAt;
  }
}

export class SellerReviewsPageDto {
  @ApiProperty({
    type: ReviewStarCountDto,
    isArray: true,
    description: 'Counts per star rating (1–5), always five entries.',
  })
  starBreakdown: ReviewStarCountDto[];

  @ApiProperty({ type: SellerReviewItemDto, isArray: true })
  items: SellerReviewItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;

  constructor(data: SellerReviewsResultData, page: number, limit: number) {
    this.starBreakdown = data.starBreakdown.map(
      (r) => new ReviewStarCountDto(r),
    );
    this.items = data.items.map((r) => new SellerReviewItemDto(r));
    this.total = data.total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(data.total / limit) || 0;
    this.hasNextPage = page < this.totalPages;
    this.hasPrevPage = page > 1;
  }
}
