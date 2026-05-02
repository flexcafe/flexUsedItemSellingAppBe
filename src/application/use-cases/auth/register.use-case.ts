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
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { EMAIL_SENDER } from '../../../domain/services/email-sender.interface.js';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import { SMS_SENDER } from '../../../domain/services/sms-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';
import { RegisterDto } from '../../dtos/auth/register.dto.js';
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
  ) {}

  async execute(dto: RegisterDto): Promise<VerificationActionResultDto> {
    this.logger.log(`Registering user: ${dto.phone}`);

    this.validateRegistrationRules(dto);

    const [existingPhone, existingEmail] = await Promise.all([
      this.userRepository.findByPhone(dto.phone),
      this.userRepository.findByEmail(dto.email),
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

    const hashedPassword = await hash(dto.password, 12);
    const referralCode = await this.generateUniqueReferralCode();

    await this.userRepository.create({
      registrationType: RegistrationType.PHONE_ONLY,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      nickname: dto.nickname,
      referralCode,
      referredById: referredById ?? undefined,
      profile: {
        gender: dto.gender,
        age: dto.age,
        maritalStatus: dto.maritalStatus,
        inputRegion: dto.region,
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

    const otpCode = this.generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.userRepository.createPhoneOtp(dto.phone, otpCode, otpExpiresAt);
    this.logger.warn(
      `[TEST_LOG] REGISTER SMS OTP GENERATED phone=${dto.phone} otp=${otpCode} expiresAt=${otpExpiresAt.toISOString()}`,
    );

    try {
      await this.smsSender.send({
        to: dto.phone,
        message: `Your verification code is ${otpCode}. It expires in 5 minutes. Do not share this code.`,
        clientReference: `register:${dto.phone}`,
      });
      this.logger.warn(
        `[TEST_LOG] REGISTER SMS OTP SEND SUCCESS phone=${dto.phone} otp=${otpCode}`,
      );
    } catch (err) {
      this.logger.warn(
        `OTP SMS failed for ${this.maskPhone(dto.phone)}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] REGISTER SMS OTP SEND FAILED phone=${dto.phone} otp=${otpCode} error=${String(err)}`,
      );
    }

    const emailToken = randomBytes(16).toString('hex');
    const emailExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepository.createEmailVerification(
      dto.email,
      emailToken,
      emailExpiresAt,
    );
    this.logger.warn(
      `[TEST_LOG] REGISTER EMAIL TOKEN GENERATED email=${dto.email} token=${emailToken} expiresAt=${emailExpiresAt.toISOString()}`,
    );

    this.logger.log(
      `Phone OTP SMS dispatched for ${this.maskPhone(dto.phone)}`,
    );
    try {
      await this.emailSender.send({
        to: dto.email,
        subject: 'Verify your email',
        text: `Your email verification token is: ${emailToken}`,
        html: `<p>Your email verification token is:</p><p><b>${emailToken}</b></p>`,
      });
      this.logger.warn(
        `[TEST_LOG] REGISTER EMAIL TOKEN SEND SUCCESS email=${dto.email} token=${emailToken}`,
      );
    } catch (err) {
      this.logger.warn(
        `Email verification send failed for ${dto.email}: ${String(err)}`,
      );
      this.logger.warn(
        `[TEST_LOG] REGISTER EMAIL TOKEN SEND FAILED email=${dto.email} token=${emailToken} error=${String(err)}`,
      );
    }
    this.logger.log(`Email verification token generated for ${dto.email}`);

    return new VerificationActionResultDto('REGISTRATION_PENDING_VERIFICATION');
  }

  private validateRegistrationRules(dto: RegisterDto): void {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmPassword must match');
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
