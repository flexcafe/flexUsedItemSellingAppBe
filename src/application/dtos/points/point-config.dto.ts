import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import type { StarPointConfigData } from '../../../domain/repositories/points.repository.interface.js';
import { RankConfigResponseDto } from './points-summary.dto.js';

export class StarPointConfigDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  starCount: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  pointsAwarded: number;

  constructor(data?: StarPointConfigData) {
    this.starCount = data?.starCount ?? 1;
    this.pointsAwarded = data?.pointsAwarded ?? 1;
  }
}

export class UpdateStarPointConfigsDto {
  @ApiProperty({ type: StarPointConfigDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StarPointConfigDto)
  configs: StarPointConfigDto[];
}

export class UpdateRankConfigDto {
  @ApiProperty({ enum: RankTier })
  @IsEnum(RankTier)
  tier: RankTier;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  minPoints: number;

  @ApiPropertyOptional({ example: 499, nullable: true, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPoints?: number | null;

  @ApiProperty({ example: 'Gold' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/badges/gold.png' })
  @IsString()
  @IsOptional()
  badgeUrl?: string;

  @ApiProperty({ example: 4, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class UpdateRankConfigsDto {
  @ApiProperty({ type: UpdateRankConfigDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRankConfigDto)
  configs: UpdateRankConfigDto[];
}

export { RankConfigResponseDto };
