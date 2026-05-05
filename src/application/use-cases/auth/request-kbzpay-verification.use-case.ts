import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { RequestKbzPayVerificationDto } from '../../dtos/auth/request-kbzpay-verification.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class RequestKbzPayVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: RequestKbzPayVerificationDto,
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

    await this.userRepository.requestKbzPayVerification(
      userId,
      dto.kbzTransactionId,
    );

    const extraMessage = dto.message ? `\n\nUser message: ${dto.message}` : '';
    const transactionMessage = dto.kbzTransactionId
      ? `\n\nSubmitted KBZPay transaction number: ${dto.kbzTransactionId}`
      : '';

    await this.userRepository.createNotification({
      userId,
      title: 'KBZPay Verification Pending',
      message:
        'Your KBZPay verification request is now pending. An admin will send the transfer phone number by notification. Please transfer exactly 100 MMK once you receive it.' +
        transactionMessage +
        extraMessage,
      referenceId: userId,
    });

    return new VerificationActionResultDto('KBZPAY_VERIFICATION_REQUESTED');
  }
}
