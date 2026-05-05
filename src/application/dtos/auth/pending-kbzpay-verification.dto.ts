import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { PendingKbzPayVerificationData } from '../../../domain/repositories/user.repository.interface.js';

export class PendingKbzPayVerificationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  kbzPayPhoneNumber: string;

  @ApiProperty({ nullable: true })
  kbzTransactionId: string | null;

  @ApiProperty({ enum: VerificationStatus })
  status: VerificationStatus;

  @ApiProperty({ nullable: true })
  verifyRequestedAt: Date | null;

  @ApiProperty({ nullable: true })
  adminPhoneForTransfer: string | null;

  @ApiProperty({ nullable: true })
  adminInstructionSentAt: Date | null;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  constructor(data: PendingKbzPayVerificationData) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.phone = data.phone;
    this.email = data.email;
    this.accountName = data.accountName;
    this.kbzPayPhoneNumber = data.kbzPayPhoneNumber;
    this.kbzTransactionId = data.kbzTransactionId;
    this.status = data.status;
    this.verifyRequestedAt = data.verifyRequestedAt;
    this.adminPhoneForTransfer = data.adminPhoneForTransfer;
    this.adminInstructionSentAt = data.adminInstructionSentAt;
    this.adminNote = data.adminNote;
  }
}
