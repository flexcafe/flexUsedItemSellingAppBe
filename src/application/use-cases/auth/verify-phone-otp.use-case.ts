import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PointSourceType } from '../../../domain/enums/point-source-type.enum.js';
import { VerifyPhoneOtpDto } from '../../dtos/auth/verify-phone-otp.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class VerifyPhoneOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(dto: VerifyPhoneOtpDto): Promise<VerificationActionResultDto> {
    const otp = await this.userRepository.findLatestActivePhoneOtp(dto.phone);

    if (!otp) {
      throw new BadRequestException(
        'No pending OTP found for this phone number',
      );
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      await this.userRepository.markPhoneOtpFailed(otp.id);
      throw new UnauthorizedException('OTP has expired');
    }

    if (otp.attempts >= otp.maxAttempts) {
      await this.userRepository.markPhoneOtpFailed(otp.id);
      throw new UnauthorizedException(
        'OTP verification failed due to too many attempts',
      );
    }

    if (otp.code !== dto.code) {
      await this.userRepository.incrementPhoneOtpAttempt(otp.id);

      const nextAttemptCount = otp.attempts + 1;
      if (nextAttemptCount >= otp.maxAttempts) {
        await this.userRepository.markPhoneOtpFailed(otp.id);
        throw new UnauthorizedException(
          'OTP verification failed due to too many attempts',
        );
      }

      throw new UnauthorizedException('Invalid OTP code');
    }

    await this.userRepository.markPhoneOtpVerified(otp.id);
    await this.userRepository.markUserPhoneVerified(dto.phone);

    const user = await this.userRepository.findByPhone(dto.phone);
    if (user) {
      await this.pointsRepository.grantAccountLifetimeMilestoneBonus(
        user.id,
        PointSourceType.PHONE_VERIFIED_BONUS,
      );
    }

    return new VerificationActionResultDto('PHONE_VERIFIED');
  }
}
