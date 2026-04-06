import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
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
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.requestKbzPayVerification(userId);

    const extraMessage = dto.message ? `\n\nUser message: ${dto.message}` : '';

    await this.userRepository.createNotification({
      userId,
      title: 'KBZPay Verification Pending',
      message:
        'Your KBZPay verification request is now pending. An admin will send the transfer phone number by notification. Please transfer exactly 100 MMK once you receive it.' +
        extraMessage,
      referenceId: userId,
    });

    return new VerificationActionResultDto('KBZPAY_VERIFICATION_REQUESTED');
  }
}
