import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { ResetPasswordDto } from '../../dtos/auth/reset-password.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { validatePendingPhoneOtp } from './_phone-otp-validation.helper.js';
import { normalizeEmail } from '../../../common/utils/normalize-email.js';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<VerificationActionResultDto> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException(
        'New password and confirmNewPassword must match',
      );
    }

    const phone = dto.phone?.trim();
    const email = dto.email?.trim();
    if ((!phone && !email) || (phone && email)) {
      throw new BadRequestException(
        'Provide exactly one identifier: phone or email',
      );
    }

    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    const user = phone
      ? await this.userRepository.findByPhone(phone)
      : await this.userRepository.findByEmail(normalizedEmail!);
    if (!user) {
      throw new NotFoundException(
        phone
          ? 'User with this phone number not found'
          : 'User with this email not found',
      );
    }

    if (user.isAdmin()) {
      throw new ForbiddenException(
        'Admin accounts must reset password via the admin dashboard',
      );
    }

    if (!user.isActiveUser()) {
      throw new UnauthorizedException('Account is deactivated or banned');
    }

    if (phone) {
      const otp = await validatePendingPhoneOtp(
        this.userRepository,
        phone,
        dto.code,
        OtpPurpose.PASSWORD_RESET,
      );

      await this.userRepository.markPhoneOtpVerified(otp.id);
    } else {
      const token = this.passwordResetEmailToken(dto.code);
      const verification = await this.userRepository.findActiveEmailVerification(
        normalizedEmail!,
        token,
      );
      if (!verification) {
        throw new BadRequestException(
          'No pending reset code found for this email',
        );
      }

      if (verification.expiresAt.getTime() < Date.now()) {
        await this.userRepository.markEmailVerificationExpired(verification.id);
        throw new UnauthorizedException('Reset code has expired');
      }

      await this.userRepository.markEmailVerificationVerified(verification.id);
    }

    const newHash = await hash(dto.newPassword, 12);
    await this.userRepository.update(user.id, {
      password: newHash,
      authTokenVersion: user.authTokenVersion + 1,
    });

    return new VerificationActionResultDto('PASSWORD_RESET');
  }

  private passwordResetEmailToken(code: string): string {
    return `pwd-reset:${code}`;
  }
}
