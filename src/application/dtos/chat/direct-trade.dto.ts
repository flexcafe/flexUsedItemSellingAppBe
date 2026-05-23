import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class AcceptDirectTradeLocationDto {
  @ApiProperty({
    example: 'Primary',
    description:
      'Label from listingLocations (e.g. "Primary" or a preferred spot label)',
  })
  @IsString()
  @Length(1, 100)
  locationLabel: string;
}

export class RequestLocationChangeDto {
  @ApiProperty({ example: '15:30', description: 'New meeting time' })
  @IsString()
  @Length(1, 20)
  meetingTime: string;

  @ApiProperty({
    example: 'Myanmar Plaza',
    description: 'Buyer suggested location',
  })
  @IsString()
  @Length(1, 255)
  @MinLength(1)
  meetingLocation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  meetingLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  meetingLongitude?: number;
}

export class RespondLocationChangeDto {
  @ApiProperty({
    description: 'true = seller accepts buyer alternate location; false = deny',
  })
  @IsBoolean()
  accepted: boolean;
}

export class AcceptLocationResponse {
  @ApiProperty({ description: 'Transaction id' })
  transactionId: string;

  @ApiProperty({ description: 'Accepted location label' })
  label: string;

  constructor(transactionId: string, label: string) {
    this.transactionId = transactionId;
    this.label = label;
  }
}
