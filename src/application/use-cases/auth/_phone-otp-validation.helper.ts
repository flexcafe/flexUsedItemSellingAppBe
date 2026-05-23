import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum.js';
import type {
  IUserRepository,
  OtpVerificationData,
} from '../../../domain/repositories/user.repository.interface.js';

export async function validatePendingPhoneOtp(
  userRepository: IUserRepository,
  phone: string,
  code: string,
  purpose: OtpPurpose,
): Promise<OtpVerificationData> {
  const otp = await userRepository.findLatestActivePhoneOtp(phone, purpose);

  if (!otp) {
    throw new BadRequestException('No pending OTP found for this phone number');
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    await userRepository.markPhoneOtpFailed(otp.id);
    throw new UnauthorizedException('OTP has expired');
  }

  if (otp.attempts >= otp.maxAttempts) {
    await userRepository.markPhoneOtpFailed(otp.id);
    throw new UnauthorizedException(
      'OTP verification failed due to too many attempts',
    );
  }

  if (otp.code !== code) {
    await userRepository.incrementPhoneOtpAttempt(otp.id);

    const nextAttemptCount = otp.attempts + 1;
    if (nextAttemptCount >= otp.maxAttempts) {
      await userRepository.markPhoneOtpFailed(otp.id);
      throw new UnauthorizedException(
        'OTP verification failed due to too many attempts',
      );
    }

    throw new UnauthorizedException('Invalid OTP code');
  }

  return otp;
}
