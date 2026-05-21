import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RewardSuggestionDto {
  @ApiProperty({
    example: 50,
    description: 'Points to award for a useful suggestion',
  })
  @IsInt()
  @Min(1)
  @Max(10_000)
  points: number;

  @ApiPropertyOptional({ example: 'Great idea — shipped in next release.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
