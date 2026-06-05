import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SMS_SENDER } from '../../../domain/services/sms-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';
import { SendPhoneOtpDto } from '../../dtos/auth/send-phone-otp.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { requireActiveAuthUser } from './_auth-user.helper.js';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class SendPhoneOtpUseCase {
  private readonly logger = new Logger(SendPhoneOtpUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(SMS_SENDER)
    private readonly smsSender: ISmsSender,
  ) {}

  async execute(dto: SendPhoneOtpDto): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByPhone(dto.phone);
    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }
    requireActiveAuthUser(user);
    if (user.isPhoneVerified) {
      throw new ConflictException('Phone number is already verified');
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.userRepository.createPhoneOtp(dto.phone, code, expiresAt);
    this.logger.warn(
      `[TEST_LOG] PHONE OTP GENERATED phone=${dto.phone} otp=${code} expiresAt=${expiresAt.toISOString()}`,
    );

    try {
      await this.smsSender.send({
        to: dto.phone,
        message: `Your verification code is ${code}. It expires in 5 minutes. Do not share this code.`,
        clientReference: `phone-otp:${dto.phone}`,
      });
      this.logger.warn(
        `[TEST_LOG] PHONE OTP SEND SUCCESS phone=${dto.phone} otp=${code}`,
      );
    } catch (err) {
      this.logger.warn(
        `Phone OTP SMS failed for ${this.maskPhone(dto.phone)}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] PHONE OTP SEND FAILED phone=${dto.phone} otp=${code} error=${String(err)}`,
      );
    }

    this.logger.log(
      `Phone OTP SMS dispatched for ${this.maskPhone(dto.phone)}`,
    );

    return new VerificationActionResultDto('PHONE_OTP_SENT');
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
