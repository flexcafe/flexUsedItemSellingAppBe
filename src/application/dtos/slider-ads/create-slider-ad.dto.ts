import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { SliderAdStatus } from '../../../domain/enums/slider-ad-status.enum.js';

export class CreateSliderAdDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsUrl()
  linkUrl?: string | null;

  @ApiProperty({ enum: SliderAdStatus, required: false })
  @IsOptional()
  @IsEnum(SliderAdStatus)
  status?: SliderAdStatus;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  endsAt?: string | null;
}
