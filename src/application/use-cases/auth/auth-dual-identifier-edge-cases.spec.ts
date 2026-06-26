/* eslint-disable
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/unbound-method
*/
import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { LoginUseCase } from './login.use-case.js';
import { RequestForgotPasswordUseCase } from './request-forgot-password.use-case.js';
import { ResetPasswordUseCase } from './reset-password.use-case.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { IEmailSender } from '../../../domain/services/email-sender.interface.js';
import type { ISmsSender } from '../../../domain/services/sms-sender.interface.js';

function buildUser(
  overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {},
) {
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
    authTokenVersion: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });
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
    setUserBanned: jest.fn(),
    delete: jest.fn(),
    getProfileAvatarUrl: jest.fn(),
    setProfileAvatar: jest.fn(),
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
    setKbzPayTransactionId: jest.fn(),
    setKbzPayVerificationInstruction: jest.fn(),
    markKbzPayVerified: jest.fn(),
    findAdminUserIds: jest.fn().mockResolvedValue([]),
    listAdminUsers: jest.fn(),
    createNotification: jest.fn(),
    listNotificationsByUserId: jest.fn(),
    markNotificationRead: jest.fn(),
    getAuthDataByUserId: jest.fn(),
    getAdminRoleByUserId: jest.fn(),
    findKbzPayVerificationRequested: jest.fn(),
    findKbzPayMoneyCheckList: jest.fn(),
    findKbzPayVerifiedUsers: jest.fn(),
    findKbzPayRegisteredAccounts: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

function buildSmsSenderMock(): jest.Mocked<ISmsSender> {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

function buildEmailSenderMock(): jest.Mocked<IEmailSender> {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

function buildLoginUseCase(repo: jest.Mocked<IUserRepository>) {
  const jwt = {
    sign: jest.fn().mockReturnValue('access-token'),
  } as unknown as JwtService;
  return new LoginUseCase(repo, jwt);
}

function buildForgotPasswordUseCase(repo: jest.Mocked<IUserRepository>) {
  return new RequestForgotPasswordUseCase(
    repo,
    buildEmailSenderMock(),
    buildSmsSenderMock(),
  );
}

describe('Dual identifier auth edge cases', () => {
  describe('Client login (phone or email)', () => {
    it('rejects admin account when logging in with email on client endpoint', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'admin@example.com', adminRoleId: 'role-root' }),
      );
      const useCase = buildLoginUseCase(repo);

      await expect(
        useCase.loginClient({
          email: 'admin@example.com',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns invalid credentials when email is not registered', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(null);
      const useCase = buildLoginUseCase(repo);

      await expect(
        useCase.loginClient({
          email: 'missing@example.com',
          password: 'pw',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('normalizes email casing and whitespace before lookup', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        email: 'john@example.com',
        password: hashed,
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue({
        user,
        profile: null,
        kbzPayAccount: null,
        adminRole: null,
      });
      const useCase = buildLoginUseCase(repo);

      await useCase.loginClient({
        email: '  JOHN@Example.COM  ',
        password: 'correct-password',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('rejects banned client when logging in with email', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'john@example.com', isBanned: true }),
      );
      const useCase = buildLoginUseCase(repo);

      await expect(
        useCase.loginClient({
          email: 'john@example.com',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows email login even when email is not verified', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        email: 'john@example.com',
        password: hashed,
        isEmailVerified: false,
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue({
        user,
        profile: null,
        kbzPayAccount: null,
        adminRole: null,
      });
      const useCase = buildLoginUseCase(repo);

      const res = await useCase.loginClient({
        email: 'john@example.com',
        password: 'correct-password',
      });

      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.isEmailVerified).toBe(false);
    });
  });

  describe('Admin login (email only)', () => {
    it('normalizes admin email before lookup', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        email: 'admin@example.com',
        password: hashed,
        adminRoleId: 'role-root',
        isPhoneVerified: true,
        isEmailVerified: true,
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue({
        user,
        profile: null,
        kbzPayAccount: null,
        adminRole: {
          id: 'role-root',
          name: 'ROOT_ADMIN',
          isSystem: true,
          permissions: [],
        },
      });
      const useCase = buildLoginUseCase(repo);

      await useCase.loginAdmin({
        email: '  ADMIN@Example.COM ',
        password: 'correct-password',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('admin@example.com');
    });
  });

  describe('Forgot password (phone or email)', () => {
    it('rejects admin forgot-password via phone', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(
        buildUser({ adminRoleId: 'role-staff' }),
      );
      const useCase = buildForgotPasswordUseCase(repo);

      await expect(
        useCase.execute({ phone: '+959123456789' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects admin forgot-password via email', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'admin@example.com', adminRoleId: 'role-staff' }),
      );
      const useCase = buildForgotPasswordUseCase(repo);

      await expect(
        useCase.execute({ email: 'admin@example.com' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns not found for unknown phone', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(null);
      const useCase = buildForgotPasswordUseCase(repo);

      await expect(
        useCase.execute({ phone: '+959999999999' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns not found for unknown email', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(null);
      const useCase = buildForgotPasswordUseCase(repo);

      await expect(
        useCase.execute({ email: 'missing@example.com' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects banned client forgot-password via email', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'john@example.com', isBanned: true }),
      );
      const useCase = buildForgotPasswordUseCase(repo);

      await expect(
        useCase.execute({ email: 'john@example.com' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('treats whitespace-only identifier as missing', async () => {
      const repo = buildRepoMock();
      const useCase = buildForgotPasswordUseCase(repo);

      await expect(
        useCase.execute({ phone: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores scoped email reset token separate from email verification tokens', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'john@example.com' }),
      );
      const useCase = buildForgotPasswordUseCase(repo);

      await useCase.execute({ email: '  JOHN@Example.COM ' });

      expect(repo.createEmailVerification).toHaveBeenCalledWith(
        'john@example.com',
        expect.stringMatching(/^pwd-reset:\d{6}$/),
        expect.any(Date),
      );
    });

    it('still succeeds when SMS provider fails on phone reset request', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      const smsSender = buildSmsSenderMock();
      smsSender.send.mockRejectedValue(new Error('SMS down'));
      const useCase = new RequestForgotPasswordUseCase(
        repo,
        buildEmailSenderMock(),
        smsSender,
      );

      const res = await useCase.execute({ phone: '+959123456789' });

      expect(res.action).toBe('PASSWORD_RESET_OTP_SENT');
      expect(repo.createPhoneOtp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset password (phone or email)', () => {
    it('rejects admin reset via email', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'admin@example.com', adminRoleId: 'role-root' }),
      );
      const useCase = new ResetPasswordUseCase(repo);

      await expect(
        useCase.execute({
          email: 'admin@example.com',
          code: '123456',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects admin reset via phone', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(
        buildUser({ adminRoleId: 'role-root' }),
      );
      const useCase = new ResetPasswordUseCase(repo);

      await expect(
        useCase.execute({
          phone: '+959123456789',
          code: '123456',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects email reset when code belongs to email verification flow', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'john@example.com' }),
      );
      repo.findActiveEmailVerification.mockResolvedValue(null);
      const useCase = new ResetPasswordUseCase(repo);

      await expect(
        useCase.execute({
          email: 'john@example.com',
          code: '123456',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toThrow(
        new BadRequestException('No pending reset code found for this email'),
      );

      expect(repo.findActiveEmailVerification).toHaveBeenCalledWith(
        'john@example.com',
        'pwd-reset:123456',
      );
    });

    it('rejects expired email reset code and marks verification expired', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'john@example.com' }),
      );
      repo.findActiveEmailVerification.mockResolvedValue({
        id: 'ev-expired',
        email: 'john@example.com',
        token: 'pwd-reset:654321',
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() - 60_000),
      });
      const useCase = new ResetPasswordUseCase(repo);

      await expect(
        useCase.execute({
          email: 'john@example.com',
          code: '654321',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toThrow(new UnauthorizedException('Reset code has expired'));

      expect(repo.markEmailVerificationExpired).toHaveBeenCalledWith(
        'ev-expired',
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('bumps auth token version on email reset success', async () => {
      const repo = buildRepoMock();
      const user = buildUser({
        id: 'user-email',
        email: 'john@example.com',
        authTokenVersion: 4,
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.findActiveEmailVerification.mockResolvedValue({
        id: 'ev-reset',
        email: 'john@example.com',
        token: 'pwd-reset:654321',
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const useCase = new ResetPasswordUseCase(repo);

      await useCase.execute({
        email: 'john@example.com',
        code: '654321',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });

      expect(repo.update).toHaveBeenCalledWith(
        'user-email',
        expect.objectContaining({ authTokenVersion: 5 }),
      );
      expect(repo.markUserEmailVerified).not.toHaveBeenCalled();
    });

    it('rejects reset when both phone and email are provided', async () => {
      const repo = buildRepoMock();
      const useCase = new ResetPasswordUseCase(repo);

      await expect(
        useCase.execute({
          phone: '+959123456789',
          email: 'john@example.com',
          code: '123456',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects phone reset when OTP purpose is phone verification not password reset', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      repo.findLatestActivePhoneOtp.mockResolvedValue(null);
      const useCase = new ResetPasswordUseCase(repo);

      await expect(
        useCase.execute({
          phone: '+959123456789',
          code: '123456',
          newPassword: 'newpass123',
          confirmNewPassword: 'newpass123',
        }),
      ).rejects.toThrow(
        new BadRequestException('No pending OTP found for this phone number'),
      );

      expect(repo.findLatestActivePhoneOtp).toHaveBeenCalledWith(
        '+959123456789',
        OtpPurpose.PASSWORD_RESET,
      );
    });
  });

  describe('Email normalization consistency', () => {
    it('allows login with different casing than stored canonical email', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        email: 'john@example.com',
        password: hashed,
      });
      repo.findByEmail.mockImplementation(async (lookupEmail: string) =>
        lookupEmail === 'john@example.com' ? user : null,
      );
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue({
        user,
        profile: null,
        kbzPayAccount: null,
        adminRole: null,
      });
      const useCase = buildLoginUseCase(repo);

      const res = await useCase.loginClient({
        email: 'JOHN@Example.COM',
        password: 'correct-password',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(res.tokens.accessToken).toBe('access-token');
    });
  });

  describe('Cross-endpoint role separation', () => {
    it('allows demoted admin (adminRoleId null) to login via client email', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        email: 'former-admin@example.com',
        password: hashed,
        adminRoleId: null,
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue({
        user,
        profile: null,
        kbzPayAccount: null,
        adminRole: null,
      });
      const useCase = buildLoginUseCase(repo);

      const res = await useCase.loginClient({
        email: 'former-admin@example.com',
        password: 'correct-password',
      });

      expect(res.user.adminRole).toBeNull();
      expect(res.tokens.accessToken).toBe('access-token');
    });

    it('blocks demoted admin from admin dashboard login', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ email: 'former-admin@example.com', adminRoleId: null }),
      );
      const useCase = buildLoginUseCase(repo);

      await expect(
        useCase.loginAdmin({
          email: 'former-admin@example.com',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
