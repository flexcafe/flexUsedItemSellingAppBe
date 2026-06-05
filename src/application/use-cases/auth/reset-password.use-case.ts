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

    const otp = await validatePendingPhoneOtp(
      this.userRepository,
      dto.phone,
      dto.code,
      OtpPurpose.PASSWORD_RESET,
    );

    await this.userRepository.markPhoneOtpVerified(otp.id);

    const newHash = await hash(dto.newPassword, 12);
    await this.userRepository.update(user.id, {
      password: newHash,
      authTokenVersion: user.authTokenVersion + 1,
    });

    return new VerificationActionResultDto('PASSWORD_RESET');
  }
}
