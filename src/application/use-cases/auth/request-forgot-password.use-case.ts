import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SMS_SENDER } from '../../../domain/services/sms-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';
import { ForgotPasswordDto } from '../../dtos/auth/forgot-password.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class RequestForgotPasswordUseCase {
  private readonly logger = new Logger(RequestForgotPasswordUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(SMS_SENDER)
    private readonly smsSender: ISmsSender,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByPhone(dto.phone);
    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }

    if (user.isAdmin()) {
      throw new ForbiddenException(
        'Admin accounts must reset password via the admin dashboard',
      );
    }

    if (!user.isActiveUser()) {
      throw new UnauthorizedException('Account is deactivated or banned');
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.userRepository.createPhoneOtp(
      dto.phone,
      code,
      expiresAt,
      OtpPurpose.PASSWORD_RESET,
    );
    this.logger.warn(
      `[TEST_LOG] PASSWORD RESET OTP GENERATED phone=${dto.phone} otp=${code} expiresAt=${expiresAt.toISOString()}`,
    );

    try {
      await this.smsSender.send({
        to: dto.phone,
        message: `Your password reset code is ${code}. It expires in 5 minutes. Do not share this code.`,
        clientReference: `password-reset:${dto.phone}`,
      });
      this.logger.warn(
        `[TEST_LOG] PASSWORD RESET OTP SEND SUCCESS phone=${dto.phone} otp=${code}`,
      );
    } catch (err) {
      this.logger.warn(
        `Password reset OTP SMS failed for ${this.maskPhone(dto.phone)}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] PASSWORD RESET OTP SEND FAILED phone=${dto.phone} otp=${code} error=${String(err)}`,
      );
    }

    this.logger.log(
      `Password reset OTP dispatched for ${this.maskPhone(dto.phone)}`,
    );

    return new VerificationActionResultDto('PASSWORD_RESET_OTP_SENT');
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
