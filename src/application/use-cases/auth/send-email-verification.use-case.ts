import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { EMAIL_SENDER } from '../../../domain/services/email-sender.interface.js';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import { SendEmailVerificationDto } from '../../dtos/auth/send-email-verification.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { requireActiveAuthUser } from './_auth-user.helper.js';

@Injectable()
export class SendEmailVerificationUseCase {
  private readonly logger = new Logger(SendEmailVerificationUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(
    dto: SendEmailVerificationDto,
  ): Promise<VerificationActionResultDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }
    requireActiveAuthUser(user);
    if (user.isEmailVerified) {
      throw new ConflictException('Email is already verified');
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepository.createEmailVerification(
      dto.email,
      token,
      expiresAt,
    );
    this.logger.warn(
      `[TEST_LOG] EMAIL TOKEN GENERATED email=${dto.email} token=${token} expiresAt=${expiresAt.toISOString()}`,
    );

    try {
      await this.emailSender.send({
        to: dto.email,
        subject: 'Verify your email',
        text: `Your email verification token is: ${token}`,
        html: `<p>Your email verification token is:</p><p><b>${token}</b></p>`,
      });
      this.logger.warn(
        `[TEST_LOG] EMAIL TOKEN SEND SUCCESS email=${dto.email} token=${token}`,
      );
    } catch (err) {
      this.logger.warn(
        `[TEST_LOG] EMAIL TOKEN SEND FAILED email=${dto.email} token=${token} error=${String(err)}`,
      );
      throw err;
    }

    this.logger.log(`Email verification token generated for ${dto.email}`);

    return new VerificationActionResultDto('EMAIL_VERIFICATION_SENT');
  }
}
