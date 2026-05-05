import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { WithdrawalStatus } from '../../../domain/enums/withdrawal-status.enum.js';
import type { WithdrawalRequestData } from '../../../domain/repositories/points.repository.interface.js';

export class RequestWithdrawalDto {
  @ApiProperty({ example: 1000, minimum: 1 })
  @IsInt()
  @Min(1)
  amount: number;
}

export class RejectWithdrawalDto {
  @ApiPropertyOptional({ example: 'User requested more than eligible amount.' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class ApproveWithdrawalDto {
  @ApiPropertyOptional({ example: 'Approved for manual KBZPay payout.' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class MarkWithdrawalPaidDto {
  @ApiProperty({ example: 'KBZ-WD-20260506-00045' })
  @IsString()
  @IsNotEmpty()
  kbzTransferRef: string;

  @ApiPropertyOptional({ example: 'Transferred manually by KBZPay.' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class WithdrawalFilterDto {
  @ApiPropertyOptional({ enum: WithdrawalStatus })
  @IsEnum(WithdrawalStatus)
  @IsOptional()
  status?: WithdrawalStatus;
}

export class WithdrawalRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  kbzPayAccountName: string | null;

  @ApiProperty({ nullable: true })
  kbzPayPhoneNumber: string | null;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: WithdrawalStatus })
  status: WithdrawalStatus;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  @ApiProperty({ nullable: true })
  processedById: string | null;

  @ApiProperty({ nullable: true })
  processedAt: Date | null;

  @ApiProperty({ nullable: true })
  kbzTransferRef: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(data: WithdrawalRequestData) {
    this.id = data.id;
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.phone = data.phone;
    this.kbzPayAccountName = data.kbzPayAccountName;
    this.kbzPayPhoneNumber = data.kbzPayPhoneNumber;
    this.amount = data.amount;
    this.status = data.status;
    this.adminNote = data.adminNote;
    this.processedById = data.processedById;
    this.processedAt = data.processedAt;
    this.kbzTransferRef = data.kbzTransferRef;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
