import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { VerifyEmailVerificationDto } from '../../dtos/auth/verify-email-verification.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class VerifyEmailVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    dto: VerifyEmailVerificationDto,
  ): Promise<VerificationActionResultDto> {
    const verification = await this.userRepository.findActiveEmailVerification(
      dto.email,
      dto.token,
    );

    if (!verification) {
      throw new BadRequestException(
        'Invalid or inactive email verification token',
      );
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await this.userRepository.markEmailVerificationExpired(verification.id);
      throw new UnauthorizedException('Email verification token has expired');
    }

    await this.userRepository.markEmailVerificationVerified(verification.id);
    await this.userRepository.markUserEmailVerified(dto.email);

    return new VerificationActionResultDto('EMAIL_VERIFIED');
  }
}
