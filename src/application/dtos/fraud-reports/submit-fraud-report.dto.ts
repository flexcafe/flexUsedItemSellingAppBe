import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FraudType } from '../../../domain/enums/fraud-type.enum.js';

export class SubmitFraudReportDto {
  @ApiProperty({
    example: 'Scammer Name',
    description: 'Name of the fraudulent user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fraudUserName: string;

  @ApiProperty({
    example: 'A1B2C3D4',
    description: 'Reported user referral code (from public profile)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  reportedReferralCode: string;

  @ApiProperty({ example: '2026-05-20', description: 'Trade date (ISO date)' })
  @IsDateString()
  tradeDate: string;

  @ApiPropertyOptional({
    example: '14:30',
    description: 'Trade time (free text)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  tradeTime?: string;

  @ApiProperty({ enum: FraudType })
  @IsEnum(FraudType)
  fraudType: FraudType;

  @ApiProperty({ description: 'Report details and evidence description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  details: string;
}
