import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SendPhoneOtpDto } from '../../dtos/auth/send-phone-otp.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class SendPhoneOtpUseCase {
  private readonly logger = new Logger(SendPhoneOtpUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: SendPhoneOtpDto): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByPhone(dto.phone);
    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.userRepository.createPhoneOtp(dto.phone, code, expiresAt);

    this.logger.log(`OTP for ${dto.phone}: ${code}`);

    return new VerificationActionResultDto('PHONE_OTP_SENT');
  }
}
