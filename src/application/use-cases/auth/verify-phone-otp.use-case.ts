import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PointSourceType } from '../../../domain/enums/point-source-type.enum.js';
import { VerifyPhoneOtpDto } from '../../dtos/auth/verify-phone-otp.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { validatePendingPhoneOtp } from './_phone-otp-validation.helper.js';
import { requireActiveAuthUser } from './_auth-user.helper.js';

@Injectable()
export class VerifyPhoneOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(dto: VerifyPhoneOtpDto): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByPhone(dto.phone);
    if (!user) {
      throw new BadRequestException('No pending OTP found for this phone number');
    }
    requireActiveAuthUser(user);

    const otp = await validatePendingPhoneOtp(
      this.userRepository,
      dto.phone,
      dto.code,
      OtpPurpose.PHONE_VERIFICATION,
    );

    await this.userRepository.markPhoneOtpVerified(otp.id);
    await this.userRepository.markUserPhoneVerified(dto.phone);

    await this.pointsRepository.grantAccountLifetimeMilestoneBonus(
      user.id,
      PointSourceType.PHONE_VERIFIED_BONUS,
    );

    return new VerificationActionResultDto('PHONE_VERIFIED');
  }
}
