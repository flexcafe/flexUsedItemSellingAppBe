import {
  BadRequestException,
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
import { EMAIL_SENDER } from '../../../domain/services/email-sender.interface.js';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import { SMS_SENDER } from '../../../domain/services/sms-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';
import { ForgotPasswordDto } from '../../dtos/auth/forgot-password.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { normalizeEmail } from '../../../common/utils/normalize-email.js';

@Injectable()
export class RequestForgotPasswordUseCase {
  private readonly logger = new Logger(RequestForgotPasswordUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
    @Inject(SMS_SENDER)
    private readonly smsSender: ISmsSender,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<VerificationActionResultDto> {
    const phone = dto.phone?.trim();
    const email = dto.email?.trim();

    if ((!phone && !email) || (phone && email)) {
      throw new BadRequestException(
        'Provide exactly one identifier: phone or email',
      );
    }

    if (phone) {
      return this.requestViaPhone(phone);
    }

    return this.requestViaEmail(normalizeEmail(email!));
  }

  private async requestViaPhone(
    phone: string,
  ): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByPhone(phone);
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
      phone,
      code,
      expiresAt,
      OtpPurpose.PASSWORD_RESET,
    );
    this.logger.warn(
      `[TEST_LOG] PASSWORD RESET OTP GENERATED phone=${phone} otp=${code} expiresAt=${expiresAt.toISOString()}`,
    );

    try {
      await this.smsSender.send({
        to: phone,
        message: `Your password reset code is ${code}. It expires in 5 minutes. Do not share this code.`,
        clientReference: `password-reset:${phone}`,
      });
      this.logger.warn(
        `[TEST_LOG] PASSWORD RESET OTP SEND SUCCESS phone=${phone} otp=${code}`,
      );
    } catch (err) {
      this.logger.warn(
        `Password reset OTP SMS failed for ${this.maskPhone(phone)}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] PASSWORD RESET OTP SEND FAILED phone=${phone} otp=${code} error=${String(err)}`,
      );
    }

    this.logger.log(`Password reset OTP dispatched for ${this.maskPhone(phone)}`);

    return new VerificationActionResultDto('PASSWORD_RESET_OTP_SENT');
  }

  private async requestViaEmail(
    email: string,
  ): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
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
    const token = this.passwordResetEmailToken(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.userRepository.createEmailVerification(email, token, expiresAt);
    this.logger.warn(
      `[TEST_LOG] PASSWORD RESET TOKEN GENERATED email=${email} code=${code} expiresAt=${expiresAt.toISOString()}`,
    );

    try {
      await this.emailSender.send({
        to: email,
        subject: 'Reset your password',
        text: `Your password reset code is ${code}. It expires in 5 minutes. Do not share this code.`,
        html: `<p>Your password reset code is:</p><p><b>${code}</b></p><p>It expires in 5 minutes. Do not share this code.</p>`,
      });
      this.logger.warn(
        `[TEST_LOG] PASSWORD RESET EMAIL SEND SUCCESS email=${email} code=${code}`,
      );
    } catch (err) {
      this.logger.warn(
        `Password reset email failed for ${this.maskEmail(email)}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] PASSWORD RESET EMAIL SEND FAILED email=${email} code=${code} error=${String(err)}`,
      );
    }

    this.logger.log(
      `Password reset code dispatched for ${this.maskEmail(email)}`,
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

  private maskEmail(email: string): string {
    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart) {
      return '***';
    }

    if (localPart.length <= 2) {
      return `***@${domainPart}`;
    }

    return `${localPart.slice(0, 2)}***@${domainPart}`;
  }

  private passwordResetEmailToken(code: string): string {
    return `pwd-reset:${code}`;
  }
}
