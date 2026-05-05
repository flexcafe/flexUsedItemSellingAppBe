import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ReviewData } from '../../../domain/repositories/points.repository.interface.js';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @ApiPropertyOptional({ example: 'Smooth trade and fast communication.' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  reviewerId: string;

  @ApiProperty()
  revieweeId: string;

  @ApiProperty()
  stars: number;

  @ApiProperty({ nullable: true })
  comment: string | null;

  @ApiProperty()
  pointsAwarded: number;

  @ApiProperty()
  createdAt: Date;

  constructor(data: ReviewData) {
    this.id = data.id;
    this.transactionId = data.transactionId;
    this.reviewerId = data.reviewerId;
    this.revieweeId = data.revieweeId;
    this.stars = data.stars;
    this.comment = data.comment;
    this.pointsAwarded = data.pointsAwarded;
    this.createdAt = data.createdAt;
  }
}
