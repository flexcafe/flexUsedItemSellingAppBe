import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SendEmailVerificationDto } from '../../dtos/auth/send-email-verification.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class SendEmailVerificationUseCase {
  private readonly logger = new Logger(SendEmailVerificationUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    dto: SendEmailVerificationDto,
  ): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepository.createEmailVerification(
      dto.email,
      token,
      expiresAt,
    );

    this.logger.log(`Email verification token for ${dto.email}: ${token}`);

    return new VerificationActionResultDto('EMAIL_VERIFICATION_SENT');
  }
}
