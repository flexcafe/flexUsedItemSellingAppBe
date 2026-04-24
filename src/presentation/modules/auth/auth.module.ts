import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AdminDashboardAuthController } from './admin-dashboard-auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RegisterUseCase } from '../../../application/use-cases/auth/register.use-case.js';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js';
import { SendPhoneOtpUseCase } from '../../../application/use-cases/auth/send-phone-otp.use-case.js';
import { VerifyPhoneOtpUseCase } from '../../../application/use-cases/auth/verify-phone-otp.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/auth/send-email-verification.use-case.js';
import { VerifyEmailVerificationUseCase } from '../../../application/use-cases/auth/verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from '../../../application/use-cases/auth/request-kbzpay-verification.use-case.js';
import { SendKbzPayInstructionUseCase } from '../../../application/use-cases/auth/send-kbzpay-instruction.use-case.js';
import { AdminVerifyKbzPayUseCase } from '../../../application/use-cases/auth/admin-verify-kbzpay.use-case.js';
import { GetCurrentUserProfileUseCase } from '../../../application/use-cases/auth/get-current-user-profile.use-case.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { EMAIL_SENDER } from '../../../domain/services/email-sender.interface.js';
import { SMS_SENDER } from '../../../domain/services/sms-sender.interface.js';
import { BrevoSmtpEmailSender } from '../../../infrastructure/email/brevo-smtp-email.sender.js';
import { SMSPohRestSmsSender } from '../../../infrastructure/sms/smspoh-rest-sms.sender.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION', '7d') },
      }),
    }),
  ],
  controllers: [AuthController, AdminDashboardAuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    SendPhoneOtpUseCase,
    VerifyPhoneOtpUseCase,
    SendEmailVerificationUseCase,
    VerifyEmailVerificationUseCase,
    RequestKbzPayVerificationUseCase,
    SendKbzPayInstructionUseCase,
    AdminVerifyKbzPayUseCase,
    GetCurrentUserProfileUseCase,
    JwtStrategy,
    {
      provide: EMAIL_SENDER,
      useClass: BrevoSmtpEmailSender,
    },
    {
      provide: SMS_SENDER,
      useClass: SMSPohRestSmsSender,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [JwtModule, JwtStrategy],
})
export class AuthModule {}
