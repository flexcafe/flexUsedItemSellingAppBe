import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { SubmitKbzPayTransactionDto } from '../../dtos/auth/submit-kbzpay-transaction.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class SubmitKbzPayTransactionUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: SubmitKbzPayTransactionDto,
  ): Promise<VerificationActionResultDto> {
    const authData = await this.userRepository.getAuthDataByUserId(userId);
    if (!authData) {
      throw new NotFoundException('User not found');
    }

    const kbz = authData.kbzPayAccount;
    if (!kbz) {
      throw new NotFoundException('KBZPay account not found');
    }

    if (kbz.isVerified || kbz.status === VerificationStatus.VERIFIED) {
      throw new ConflictException('KBZPay is already verified');
    }

    if (!kbz.verifyRequestedAt) {
      throw new BadRequestException(
        'KBZPay verification request must be created first',
      );
    }

    if (!kbz.adminInstructionSentAt || !kbz.adminPhoneForTransfer) {
      throw new BadRequestException(
        'Admin transfer instruction has not been sent yet',
      );
    }

    await this.userRepository.setKbzPayTransactionId(
      userId,
      dto.kbzTransactionId,
    );

    return new VerificationActionResultDto('KBZPAY_TRANSACTION_SUBMITTED');
  }
}
