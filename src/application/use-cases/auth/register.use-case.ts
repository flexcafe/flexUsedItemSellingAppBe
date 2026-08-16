import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt } from 'crypto';
import { hash } from 'bcrypt';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import { PointSourceType } from '../../../domain/enums/point-source-type.enum.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { EMAIL_SENDER } from '../../../domain/services/email-sender.interface.js';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import { SMS_SENDER } from '../../../domain/services/sms-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';
import { RegisterDto } from '../../dtos/auth/register.dto.js';
import { normalizeEmail } from '../../../common/utils/normalize-email.js';
import { CURRENT_TERMS_VERSION } from '../../../domain/constants/terms-of-service.constant.js';
import { extractRegionFromCoordinates } from '../../../common/utils/extract-myanmar-region.js';
// Registration no longer issues auth tokens. Tokens are only issued after
// phone + email are verified and the user logs in.
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
    @Inject(SMS_SENDER)
    private readonly smsSender: ISmsSender,
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
  ) {}

  async execute(dto: RegisterDto): Promise<VerificationActionResultDto> {
    const email = normalizeEmail(dto.email);
    this.logger.log(`Registering user: ${dto.phone}`);

    this.validateRegistrationRules(dto);

    const [existingPhone, existingEmail] = await Promise.all([
      this.userRepository.findByPhone(dto.phone),
      this.userRepository.findByEmail(email),
    ]);

    if (existingPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const referredById = await this.resolveReferrer(dto.referralId);
    const inputRegion = await this.resolveInputRegion(dto);

    const hashedPassword = await hash(dto.password, 12);
    const referralCode = await this.generateUniqueReferralCode();

    const createdUser = await this.userRepository.create({
      registrationType: RegistrationType.PHONE_ONLY,
      phone: dto.phone,
      email,
      password: hashedPassword,
      nickname: dto.nickname,
      referralCode,
      referredById: referredById ?? undefined,
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
      profile: {
        gender: dto.gender,
        age: dto.age,
        maritalStatus: dto.maritalStatus,
        inputRegion,
        gpsLatitude: dto.gpsLatitude,
        gpsLongitude: dto.gpsLongitude,
        isRegionVerified: true,
        gpsVerifiedAt: new Date(),
      },
      kbzPayAccount: {
        accountName: dto.kbzPayName,
        phoneNumber: dto.kbzPayPhoneNumber,
      },
    });

    await this.pointsRepository.grantAccountLifetimeMilestoneBonus(
      createdUser.id,
      PointSourceType.REGISTRATION_BONUS,
    );

    const otpCode = this.generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.userRepository.createPhoneOtp(dto.phone, otpCode, otpExpiresAt);

    await this.smsSender.send({
      to: dto.phone,
      message: `Your verification code is ${otpCode}. It expires in 5 minutes. Do not share this code.`,
      clientReference: `reg:${Date.now()}:${createdUser.id.slice(0, 8)}`,
    });

    const emailToken = randomBytes(16).toString('hex');
    const emailExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepository.createEmailVerification(
      email,
      emailToken,
      emailExpiresAt,
    );
    this.logger.warn(
      `[TEST_LOG] REGISTER EMAIL TOKEN GENERATED email=${email} token=${emailToken} expiresAt=${emailExpiresAt.toISOString()}`,
    );

    this.logger.log(
      `Phone OTP SMS dispatched for ${this.maskPhone(dto.phone)}`,
    );
    try {
      await this.emailSender.send({
        to: email,
        subject: 'Verify your email',
        text: `Your email verification token is: ${emailToken}`,
        html: `<p>Your email verification token is:</p><p><b>${emailToken}</b></p>`,
      });
      this.logger.warn(
        `[TEST_LOG] REGISTER EMAIL TOKEN SEND SUCCESS email=${email} token=${emailToken}`,
      );
    } catch (err) {
      this.logger.warn(
        `Email verification send failed for ${email}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] REGISTER EMAIL TOKEN SEND FAILED email=${email} token=${emailToken} error=${String(err)}`,
      );
    }
    this.logger.log(`Email verification token generated for ${email}`);

    return new VerificationActionResultDto('REGISTRATION_PENDING_VERIFICATION');
  }

  private async resolveInputRegion(dto: RegisterDto): Promise<string> {
    let extracted: string | null = null;
    try {
      extracted = await extractRegionFromCoordinates(
        dto.gpsLatitude,
        dto.gpsLongitude,
      );
    } catch {
      extracted = null;
    }
    if (extracted) {
      return extracted;
    }

    const fallback = dto.region?.trim();
    if (fallback) {
      return fallback;
    }

    throw new BadRequestException(
      'Unable to determine region from the provided location',
    );
  }

  private validateRegistrationRules(dto: RegisterDto): void {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmPassword must match');
    }
    if (!dto.acceptedTerms) {
      throw new BadRequestException(
        'You must accept the Terms of Use before registering',
      );
    }
    if (dto.termsVersion.trim() !== CURRENT_TERMS_VERSION) {
      throw new BadRequestException(
        `Please accept the current Terms of Use (version ${CURRENT_TERMS_VERSION})`,
      );
    }
  }

  private async resolveReferrer(referralId?: string): Promise<string | null> {
    if (!referralId) {
      return null;
    }

    const referrer = await this.userRepository.findByReferralCode(referralId);
    if (!referrer) {
      throw new BadRequestException('Invalid referralId');
    }

    return referrer.id;
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.userRepository.findByReferralCode(code);
      if (!exists) {
        return code;
      }
    }

    throw new BadRequestException('Unable to generate unique referral code');
  }

  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
