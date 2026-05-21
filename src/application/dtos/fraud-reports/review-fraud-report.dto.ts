import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConfirmFraudReportDto {
  @ApiProperty({
    description: 'Message sent to the reporter (required)',
    example: 'We confirmed fraud and took action. Thank you for reporting.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reporterMessage: string;

  @ApiPropertyOptional({
    description: 'Optional message to the reported user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reportedUserMessage?: string;

  @ApiProperty({
    description: 'Ban the reported user account',
    default: true,
  })
  @IsBoolean()
  blockReportedUser: boolean;

  @ApiPropertyOptional({ description: 'Internal admin note' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}

export class DismissFraudReportDto {
  @ApiProperty({
    description: 'Message sent to the reporter',
    example: 'We reviewed your report and could not confirm fraud at this time.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reporterMessage: string;

  @ApiPropertyOptional({ description: 'Internal admin note' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}

export class BanUserDto {
  @ApiPropertyOptional({ example: 'Confirmed fraud from report #...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  banReason?: string;
}
