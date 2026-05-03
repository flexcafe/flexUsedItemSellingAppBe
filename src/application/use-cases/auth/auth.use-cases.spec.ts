import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUseCase } from './register.use-case.js';
import { LoginUseCase } from './login.use-case.js';
import { SendPhoneOtpUseCase } from './send-phone-otp.use-case.js';
import { VerifyPhoneOtpUseCase } from './verify-phone-otp.use-case.js';
import { SendEmailVerificationUseCase } from './send-email-verification.use-case.js';
import { VerifyEmailVerificationUseCase } from './verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from './request-kbzpay-verification.use-case.js';
import { SendKbzPayInstructionUseCase } from './send-kbzpay-instruction.use-case.js';
import { AdminVerifyKbzPayUseCase } from './admin-verify-kbzpay.use-case.js';
import type { IUserRepository, UserAuthData } from '../../../domain/repositories/user.repository.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../../domain/enums/marital-status.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { hash } from 'bcrypt';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';

function buildUser(overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {}) {
  return new UserEntity({
    id: 'user-1',
    registrationType: RegistrationType.PHONE_ONLY,
    phone: '+959123456789',
    email: 'john@example.com',
    password: 'hashed',
    nickname: 'Nick',
    facebookId: null,
    isEmailVerified: false,
    isPhoneVerified: false,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    isActive: true,
    isBanned: false,
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: 'REFCODE',
    referredById: null,
    adminRoleId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });
}

function buildAuthData(user: UserEntity): UserAuthData {
  return {
    user,
    profile: {
      gender: Gender.MALE,
      age: 27,
      maritalStatus: MaritalStatus.SINGLE,
      inputRegion: 'Yangon Region',
      gpsLatitude: 16.84,
      gpsLongitude: 96.17,
      isRegionVerified: true,
      gpsVerifiedAt: new Date('2026-01-01'),
    },
    kbzPayAccount: {
      accountName: 'Kyaw Zin',
      phoneNumber: '+959876543210',
      status: VerificationStatus.PENDING,
      isVerified: false,
      verifyRequestedAt: null,
      adminPhoneForTransfer: null,
      adminInstructionSentAt: null,
      verifiedAt: null,
      adminNote: null,
    },
  };
}

function buildRepoMock(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findByFacebookId: jest.fn(),
    findByReferralCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createPhoneOtp: jest.fn(),
    findLatestActivePhoneOtp: jest.fn(),
    incrementPhoneOtpAttempt: jest.fn(),
    markPhoneOtpFailed: jest.fn(),
    markPhoneOtpVerified: jest.fn(),
    markUserPhoneVerified: jest.fn(),
    createEmailVerification: jest.fn(),
    findActiveEmailVerification: jest.fn(),
    markEmailVerificationExpired: jest.fn(),
    markEmailVerificationVerified: jest.fn(),
    markUserEmailVerified: jest.fn(),
    requestKbzPayVerification: jest.fn(),
    setKbzPayVerificationInstruction: jest.fn(),
    markKbzPayVerified: jest.fn(),
    createNotification: jest.fn(),
    getAuthDataByUserId: jest.fn(),
  };
}

function buildEmailSenderMock(): jest.Mocked<IEmailSender> {
  return {
    send: jest.fn(),
  };
}

function buildSmsSenderMock(): jest.Mocked<ISmsSender> {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

describe('Auth use-cases (registration + login + verification flows)', () => {
  describe(RegisterUseCase.name, () => {
    it('rejects when password != confirmPassword', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
      const useCase = new RegisterUseCase(repo, jwt, emailSender, smsSender);

      await expect(
        useCase.execute({
          nickname: 'Nick',
          phone: '+959123456789',
          email: 'john@example.com',
          password: 'password123',
          confirmPassword: 'password124',
          kbzPayName: 'Kyaw Zin',
          kbzPayPhoneNumber: '+959876543210',
          gender: Gender.MALE,
          age: 27,
          maritalStatus: MaritalStatus.SINGLE,
          region: 'Yangon Region',
          gpsLatitude: 16.84,
          gpsLongitude: 96.17,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate phone/email', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      repo.findByEmail.mockResolvedValue(null);

      const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
      const useCase = new RegisterUseCase(repo, jwt, emailSender, smsSender);

      await expect(
        useCase.execute({
          nickname: 'Nick',
          phone: '+959123456789',
          email: 'john@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          kbzPayName: 'Kyaw Zin',
          kbzPayPhoneNumber: '+959876543210',
          gender: Gender.MALE,
          age: 27,
          maritalStatus: MaritalStatus.SINGLE,
          region: 'Yangon Region',
          gpsLatitude: 16.84,
          gpsLongitude: 96.17,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects invalid referralId', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(null);
      repo.findByEmail.mockResolvedValue(null);
      repo.findByReferralCode.mockResolvedValue(null);
      const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
      const useCase = new RegisterUseCase(repo, jwt, emailSender, smsSender);

      await expect(
        useCase.execute({
          nickname: 'Nick',
          phone: '+959123456789',
          email: 'john@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          kbzPayName: 'Kyaw Zin',
          kbzPayPhoneNumber: '+959876543210',
          gender: Gender.MALE,
          age: 27,
          maritalStatus: MaritalStatus.SINGLE,
          region: 'Yangon Region',
          gpsLatitude: 16.84,
          gpsLongitude: 96.17,
          referralId: 'BADCODE',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates user + initializes OTP & email verification + returns pending action (no token)', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(null);
      repo.findByEmail.mockResolvedValue(null);
      repo.findByReferralCode.mockResolvedValue(null);

      const createdUser = buildUser({
        id: 'user-new',
        registrationType: RegistrationType.PHONE_ONLY,
      });
      repo.create.mockResolvedValue(createdUser);

      const jwt = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;
      const useCase = new RegisterUseCase(repo, jwt, emailSender, smsSender);

      const res = await useCase.execute({
        nickname: 'Nick',
        phone: '+959123456789',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        kbzPayName: 'Kyaw Zin',
        kbzPayPhoneNumber: '+959876543210',
        gender: Gender.MALE,
        age: 27,
        maritalStatus: MaritalStatus.SINGLE,
        region: 'Yangon Region',
        gpsLatitude: 16.84,
        gpsLongitude: 96.17,
      });

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          registrationType: RegistrationType.PHONE_ONLY,
        }),
      );
      expect(repo.createPhoneOtp).toHaveBeenCalledTimes(1);
      expect(repo.createEmailVerification).toHaveBeenCalledTimes(1);
      expect(smsSender.send).toHaveBeenCalledTimes(1);
      expect(emailSender.send).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledTimes(0);
      expect(res.action).toBe('REGISTRATION_PENDING_VERIFICATION');
    });
  });

  describe(LoginUseCase.name, () => {
    it('rejects client login when user is an admin', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ adminRoleId: 'role-root' });
      repo.findByPhone.mockResolvedValue(user);
      const jwt = { sign: jest.fn().mockReturnValue('t') } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({ phone: user.phone, password: 'pw' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects admin login when user is not an admin', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ email: 'client@example.com', adminRoleId: null });
      repo.findByEmail.mockResolvedValue(user);
      const jwt = { sign: jest.fn().mockReturnValue('t') } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginAdmin({ email: 'client@example.com', password: 'pw' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects inactive/banned account (client)', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(buildUser({ isBanned: true }));
      const jwt = { sign: jest.fn().mockReturnValue('t') } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({ phone: '+959123456789', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when password is invalid (client)', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({ password: hashed });
      repo.findByPhone.mockResolvedValue(user);

      const jwt = { sign: jest.fn().mockReturnValue('t') } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({ phone: user.phone, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('logs in client with phone+password and returns profile + token', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        id: 'user-99',
        password: hashed,
        isPhoneVerified: true,
        isEmailVerified: true,
        adminRoleId: null,
      });
      repo.findByPhone.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));

      const jwt = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      const res = await useCase.loginClient({
        phone: user.phone,
        password: 'correct-password',
      });

      expect(repo.update).toHaveBeenCalledWith('user-99', expect.objectContaining({ lastLoginAt: expect.any(Date) }));
      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.id).toBe('user-99');
      expect(res.user.phone).toBe(user.phone);
    });

    it('logs in admin with email+password and returns profile + token', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        id: 'user-admin',
        email: 'admin@example.com',
        password: hashed,
        isPhoneVerified: true,
        isEmailVerified: true,
        adminRoleId: 'role-root',
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));

      const jwt = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      const res = await useCase.loginAdmin({
        email: 'admin@example.com',
        password: 'correct-password',
      });

      expect(repo.update).toHaveBeenCalledWith('user-admin', expect.objectContaining({ lastLoginAt: expect.any(Date) }));
      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.email).toBe('admin@example.com');
    });
  });

  describe('OTP + Email + KBZPay flows are callable', () => {
    it('SendPhoneOtpUseCase persists OTP and sends SMS', async () => {
      const repo = buildRepoMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      const useCase = new SendPhoneOtpUseCase(repo, smsSender);
      const res = await useCase.execute({ phone: '+959123456789' });
      expect(res.action).toBe('PHONE_OTP_SENT');
      expect(repo.createPhoneOtp).toHaveBeenCalledTimes(1);
      expect(smsSender.send).toHaveBeenCalledTimes(1);
      expect(smsSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+959123456789',
          message: expect.stringMatching(/Your verification code is \d{6}\./),
          clientReference: 'phone-otp:+959123456789',
        }),
      );
    });

    it('VerifyPhoneOtpUseCase verifies correct code', async () => {
      const repo = buildRepoMock();
      repo.findLatestActivePhoneOtp.mockResolvedValue({
        id: 'otp1',
        phone: '+959123456789',
        code: '123456',
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        maxAttempts: 5,
      });
      const useCase = new VerifyPhoneOtpUseCase(repo);
      const res = await useCase.execute({ phone: '+959123456789', code: '123456' });
      expect(res.action).toBe('PHONE_VERIFIED');
      expect(repo.markPhoneOtpVerified).toHaveBeenCalledWith('otp1');
      expect(repo.markUserPhoneVerified).toHaveBeenCalledWith('+959123456789');
    });

    it('SendEmailVerificationUseCase calls createEmailVerification', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      repo.findByEmail.mockResolvedValue(buildUser());
      const useCase = new SendEmailVerificationUseCase(repo, emailSender);
      const res = await useCase.execute({ email: 'john@example.com' });
      expect(res.action).toBe('EMAIL_VERIFICATION_SENT');
      expect(repo.createEmailVerification).toHaveBeenCalledTimes(1);
      expect(emailSender.send).toHaveBeenCalledTimes(1);
    });

    it('VerifyEmailVerificationUseCase marks email verified on valid token', async () => {
      const repo = buildRepoMock();
      repo.findActiveEmailVerification.mockResolvedValue({
        id: 'ev1',
        email: 'john@example.com',
        token: 'tok',
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const useCase = new VerifyEmailVerificationUseCase(repo);
      const res = await useCase.execute({ email: 'john@example.com', token: 'tok' });
      expect(res.action).toBe('EMAIL_VERIFIED');
      expect(repo.markEmailVerificationVerified).toHaveBeenCalledWith('ev1');
      expect(repo.markUserEmailVerified).toHaveBeenCalledWith('john@example.com');
    });

    it('KBZPay request sets pending and notifies user', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));
      const useCase = new RequestKbzPayVerificationUseCase(repo);
      const res = await useCase.execute('user-1', { message: 'pls' });
      expect(res.action).toBe('KBZPAY_VERIFICATION_REQUESTED');
      expect(repo.requestKbzPayVerification).toHaveBeenCalledWith('user-1');
      expect(repo.createNotification).toHaveBeenCalledTimes(1);
    });

    it('KBZPay request rejects when already verified', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      const authData = buildAuthData(user);
      authData.kbzPayAccount = {
        ...authData.kbzPayAccount!,
        isVerified: true,
        status: VerificationStatus.VERIFIED,
      };
      repo.getAuthDataByUserId.mockResolvedValue(authData);
      const useCase = new RequestKbzPayVerificationUseCase(repo);

      await expect(
        useCase.execute('user-1', {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.requestKbzPayVerification).not.toHaveBeenCalled();
      expect(repo.createNotification).not.toHaveBeenCalled();
    });

    it('KBZPay request rejects when KBZPay account row missing', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      const authData = buildAuthData(user);
      authData.kbzPayAccount = null;
      repo.getAuthDataByUserId.mockResolvedValue(authData);
      const useCase = new RequestKbzPayVerificationUseCase(repo);

      await expect(useCase.execute('user-1', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.requestKbzPayVerification).not.toHaveBeenCalled();
    });

    it('Admin KBZPay instruction requires admin user', async () => {
      const repo = buildRepoMock();
      repo.findById.mockImplementation(async (id: string) => {
        if (id === 'admin-1') return buildUser({ id, adminRoleId: null });
        return buildUser({ id });
      });
      const useCase = new SendKbzPayInstructionUseCase(repo);

      await expect(
        useCase.execute('admin-1', 'user-1', { adminPhoneForTransfer: '+9597000' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('Admin can verify KBZPay when admin', async () => {
      const repo = buildRepoMock();
      repo.findById.mockImplementation(async (id: string) => {
        if (id === 'admin-1') return buildUser({ id, adminRoleId: 'role-1' });
        return buildUser({ id });
      });
      const useCase = new AdminVerifyKbzPayUseCase(repo);
      const res = await useCase.execute('admin-1', 'user-1', {});
      expect(res.action).toBe('KBZPAY_VERIFIED');
      expect(repo.markKbzPayVerified).toHaveBeenCalledWith('user-1', 'admin-1', undefined);
      expect(repo.createNotification).toHaveBeenCalledTimes(1);
    });
  });
});

