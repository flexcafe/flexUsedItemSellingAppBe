/* eslint-disable
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/require-await,
  @typescript-eslint/unbound-method
*/
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
import { RequestForgotPasswordUseCase } from './request-forgot-password.use-case.js';
import { ResetPasswordUseCase } from './reset-password.use-case.js';
import { SendEmailVerificationUseCase } from './send-email-verification.use-case.js';
import { VerifyEmailVerificationUseCase } from './verify-email-verification.use-case.js';
import { RequestKbzPayVerificationUseCase } from './request-kbzpay-verification.use-case.js';
import { SubmitKbzPayTransactionUseCase } from './submit-kbzpay-transaction.use-case.js';
import { SendKbzPayInstructionUseCase } from './send-kbzpay-instruction.use-case.js';
import { AdminVerifyKbzPayUseCase } from './admin-verify-kbzpay.use-case.js';
import { ListKbzPayVerificationRequestedUseCase } from './list-kbzpay-verification-requested.use-case.js';
import type {
  IUserRepository,
  UserAuthData,
} from '../../../domain/repositories/user.repository.interface.js';
import type { IPointsRepository } from '../../../domain/repositories/points.repository.interface.js';
import { PointSourceType } from '../../../domain/enums/point-source-type.enum.js';
import {
  ProfileVerificationTagAction,
  ProfileVerificationTagStatus,
  ProfileVerificationTagType,
  UserProfileDto,
} from '../../dtos/auth/auth-response.dto.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../../domain/enums/marital-status.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { hash } from 'bcrypt';
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });
}

function buildAuthData(
  user: UserEntity,
  adminRole: UserAuthData['adminRole'] = null,
): UserAuthData {
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
      kbzTransactionId: null,
      status: VerificationStatus.PENDING,
      isVerified: false,
      verifyRequestedAt: null,
      adminPhoneForTransfer: null,
      adminInstructionSentAt: null,
      verifiedAt: null,
      adminNote: null,
    },
    adminRole,
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
    deleteAccount: jest.fn(),
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
    findAdminUserIds: jest.fn().mockResolvedValue([]),
    setKbzPayVerificationInstruction: jest.fn(),
    markKbzPayVerified: jest.fn(),
    createNotification: jest.fn(),
    listNotificationsByUserId: jest.fn(),
    markNotificationRead: jest.fn(),
    findKbzPayVerificationRequested: jest.fn(),
    findKbzPayMoneyCheckList: jest.fn(),
    findKbzPayVerifiedUsers: jest.fn(),
    findKbzPayRegisteredAccounts: jest.fn(),
    getAuthDataByUserId: jest.fn(),
    getAdminRoleByUserId: jest.fn().mockResolvedValue({
      id: 'role-1',
      name: 'USER_ADMIN',
      isSystem: false,
      permissions: [AdminPermission.MANAGE_USERS],
    }),
    getProfileAvatarUrl: jest.fn().mockResolvedValue(null),
    setProfileAvatar: jest.fn(),
  };
}

function buildPointsRepoMock(): jest.Mocked<IPointsRepository> {
  return {
    getUserPointsSummary: jest.fn(),
    getUserTransactionStats: jest.fn(),
    getPublicUserProfile: jest.fn(),
    getStarPointConfigs: jest.fn(),
    upsertStarPointConfigs: jest.fn(),
    getRankConfigs: jest.fn(),
    upsertRankConfigs: jest.fn(),
    findTransactionReviewContext: jest.fn(),
    hasReview: jest.fn(),
    createReviewAndAwardPoints: jest.fn(),
    createWithdrawalRequest: jest.fn(),
    findUserWithdrawalRequests: jest.fn(),
    findWithdrawalRequests: jest.fn(),
    approveWithdrawal: jest.fn(),
    rejectWithdrawal: jest.fn(),
    markWithdrawalPaid: jest.fn(),
    grantAccountLifetimeMilestoneBonus: jest.fn().mockResolvedValue(true),
    deductPointsForTransactionCancellation: jest.fn(),
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
      const jwt = {
        sign: jest.fn().mockReturnValue('token'),
      } as unknown as JwtService;
      const pointsRepo = buildPointsRepoMock();
      const useCase = new RegisterUseCase(
        repo,
        jwt,
        emailSender,
        smsSender,
        pointsRepo,
      );

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
          acceptedTerms: true,
          termsVersion: '1.0',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).not.toHaveBeenCalled();
    });

    it('rejects duplicate phone/email', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      repo.findByEmail.mockResolvedValue(null);

      const jwt = {
        sign: jest.fn().mockReturnValue('token'),
      } as unknown as JwtService;
      const pointsRepo = buildPointsRepoMock();
      const useCase = new RegisterUseCase(
        repo,
        jwt,
        emailSender,
        smsSender,
        pointsRepo,
      );

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
          acceptedTerms: true,
          termsVersion: '1.0',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).not.toHaveBeenCalled();
    });

    it('rejects invalid referralId', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(null);
      repo.findByEmail.mockResolvedValue(null);
      repo.findByReferralCode.mockResolvedValue(null);
      const jwt = {
        sign: jest.fn().mockReturnValue('token'),
      } as unknown as JwtService;
      const pointsRepo = buildPointsRepoMock();
      const useCase = new RegisterUseCase(
        repo,
        jwt,
        emailSender,
        smsSender,
        pointsRepo,
      );

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
          acceptedTerms: true,
          termsVersion: '1.0',
          referralId: 'BADCODE',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).not.toHaveBeenCalled();
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

      const jwt = {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService;
      const pointsRepo = buildPointsRepoMock();
      const useCase = new RegisterUseCase(
        repo,
        jwt,
        emailSender,
        smsSender,
        pointsRepo,
      );

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
          acceptedTerms: true,
          termsVersion: '1.0',
      });

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          registrationType: RegistrationType.PHONE_ONLY,
          termsVersion: '1.0',
          termsAcceptedAt: expect.any(Date),
        }),
      );
      expect(repo.createPhoneOtp).toHaveBeenCalledTimes(1);
      expect(repo.createEmailVerification).toHaveBeenCalledTimes(1);
      expect(smsSender.send).toHaveBeenCalledTimes(1);
      expect(emailSender.send).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledTimes(0);
      expect(res.action).toBe('REGISTRATION_PENDING_VERIFICATION');
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).toHaveBeenCalledWith('user-new', PointSourceType.REGISTRATION_BONUS);
    });

    it('rejects when acceptedTerms is false', async () => {
      const useCase = new RegisterUseCase(
        buildRepoMock(),
        { sign: jest.fn() } as unknown as JwtService,
        buildEmailSenderMock(),
        buildSmsSenderMock(),
        buildPointsRepoMock(),
      );
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
          acceptedTerms: false,
          termsVersion: '1.0',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects wrong termsVersion', async () => {
      const useCase = new RegisterUseCase(
        buildRepoMock(),
        { sign: jest.fn() } as unknown as JwtService,
        buildEmailSenderMock(),
        buildSmsSenderMock(),
        buildPointsRepoMock(),
      );
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
          acceptedTerms: true,
          termsVersion: '0.9',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores normalized email when registration dto uses mixed case', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(null);
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(buildUser({ id: 'user-new' }));
      const useCase = new RegisterUseCase(
        repo,
        { sign: jest.fn() } as unknown as JwtService,
        emailSender,
        smsSender,
        buildPointsRepoMock(),
      );

      await useCase.execute({
        nickname: 'Nick',
        phone: '+959123456789',
        email: '  JOHN@Example.COM ',
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
          acceptedTerms: true,
          termsVersion: '1.0',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john@example.com' }),
      );
      expect(repo.createEmailVerification).toHaveBeenCalledWith(
        'john@example.com',
        expect.any(String),
        expect.any(Date),
      );
      expect(emailSender.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'john@example.com' }),
      );
    });

    it('rejects duplicate email when only casing differs', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(null);
      repo.findByEmail.mockResolvedValue(buildUser({ email: 'john@example.com' }));
      const useCase = new RegisterUseCase(
        repo,
        { sign: jest.fn() } as unknown as JwtService,
        buildEmailSenderMock(),
        buildSmsSenderMock(),
        buildPointsRepoMock(),
      );

      await expect(
        useCase.execute({
          nickname: 'Nick',
          phone: '+959999999999',
          email: 'JOHN@Example.COM',
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
          acceptedTerms: true,
          termsVersion: '1.0',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe(LoginUseCase.name, () => {
    it('rejects client login when user is an admin', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ adminRoleId: 'role-root' });
      repo.findByPhone.mockResolvedValue(user);
      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({ phone: user.phone, password: 'pw' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects admin login when user is not an admin', async () => {
      const repo = buildRepoMock();
      const user = buildUser({
        email: 'client@example.com',
        adminRoleId: null,
      });
      repo.findByEmail.mockResolvedValue(user);
      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginAdmin({ email: 'client@example.com', password: 'pw' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects inactive/banned account (client)', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(buildUser({ isBanned: true }));
      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({ phone: '+959123456789', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects permanently deleted account (client)', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(
        buildUser({
          deletedAt: new Date('2026-07-29T12:00:00.000Z'),
          isActive: false,
        }),
      );
      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
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

      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({ phone: user.phone, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows client login even when phone/email are not yet verified', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        id: 'user-unverified',
        password: hashed,
        isPhoneVerified: false,
        isEmailVerified: false,
        adminRoleId: null,
      });
      repo.findByPhone.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));

      const jwt = {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      const res = await useCase.loginClient({
        phone: user.phone,
        password: 'correct-password',
      });

      expect(repo.update).toHaveBeenCalledWith(
        'user-unverified',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.isPhoneVerified).toBe(false);
      expect(res.user.isEmailVerified).toBe(false);
      expect(res.user.adminRole).toBeNull();
      expect(res.user.verificationTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: ProfileVerificationTagType.PHONE,
            status: ProfileVerificationTagStatus.UNVERIFIED,
            canVerifyFromProfile: true,
            action: ProfileVerificationTagAction.SEND_PHONE_OTP,
          }),
          expect.objectContaining({
            type: ProfileVerificationTagType.EMAIL,
            status: ProfileVerificationTagStatus.UNVERIFIED,
            canVerifyFromProfile: true,
            action: ProfileVerificationTagAction.SEND_EMAIL_VERIFICATION,
          }),
        ]),
      );
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

      const jwt = {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      const res = await useCase.loginClient({
        phone: user.phone,
        password: 'correct-password',
      });

      expect(repo.update).toHaveBeenCalledWith(
        'user-99',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.id).toBe('user-99');
      expect(res.user.phone).toBe(user.phone);
      expect(res.user.adminRole).toBeNull();
      expect(res.user.verificationTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: ProfileVerificationTagType.PHONE,
            status: ProfileVerificationTagStatus.VERIFIED,
            isVerified: true,
            canVerifyFromProfile: false,
            action: null,
          }),
          expect.objectContaining({
            type: ProfileVerificationTagType.EMAIL,
            status: ProfileVerificationTagStatus.VERIFIED,
            isVerified: true,
            canVerifyFromProfile: false,
            action: null,
          }),
          expect.objectContaining({
            type: ProfileVerificationTagType.KBZPAY,
            status: ProfileVerificationTagStatus.UNVERIFIED,
            isVerified: false,
            canVerifyFromProfile: true,
            action: ProfileVerificationTagAction.REQUEST_KBZPAY_VERIFICATION,
          }),
        ]),
      );
    });

    it('logs in client with email+password and returns profile + token', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        id: 'user-email-login',
        email: 'client@example.com',
        password: hashed,
        isPhoneVerified: true,
        isEmailVerified: true,
        adminRoleId: null,
      });
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);
      repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));

      const jwt = {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      const res = await useCase.loginClient({
        email: 'client@example.com',
        password: 'correct-password',
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('client@example.com');
      expect(repo.update).toHaveBeenCalledWith(
        'user-email-login',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.id).toBe('user-email-login');
    });

    it('rejects client login when both phone and email are provided', async () => {
      const repo = buildRepoMock();
      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({
          phone: '+959123456789',
          email: 'client@example.com',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects client login when neither phone nor email is provided', async () => {
      const repo = buildRepoMock();
      const jwt = {
        sign: jest.fn().mockReturnValue('t'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginClient({
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
      repo.getAuthDataByUserId.mockResolvedValue(
        buildAuthData(user, {
          id: 'role-root',
          name: 'ROOT_ADMIN',
          isSystem: true,
          permissions: [
            AdminPermission.MANAGE_USERS,
            AdminPermission.MANAGE_CATEGORIES,
          ],
        }),
      );

      const jwt = {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      const res = await useCase.loginAdmin({
        email: 'admin@example.com',
        password: 'correct-password',
      });

      expect(repo.update).toHaveBeenCalledWith(
        'user-admin',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
      expect(res.tokens.accessToken).toBe('access-token');
      expect(res.user.email).toBe('admin@example.com');
      expect(res.user.adminRole).toEqual({
        id: 'role-root',
        name: 'ROOT_ADMIN',
        isSystem: true,
        permissions: [
          AdminPermission.MANAGE_USERS,
          AdminPermission.MANAGE_CATEGORIES,
        ],
      });
    });

    it('rejects admin login when phone/email are unverified', async () => {
      const repo = buildRepoMock();
      const hashed = await hash('correct-password', 12);
      const user = buildUser({
        email: 'admin@example.com',
        password: hashed,
        adminRoleId: 'role-root',
        isPhoneVerified: false,
        isEmailVerified: false,
      });
      repo.findByEmail.mockResolvedValue(user);

      const jwt = {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService;
      const useCase = new LoginUseCase(repo, jwt);

      await expect(
        useCase.loginAdmin({
          email: 'admin@example.com',
          password: 'correct-password',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe(UserProfileDto.name, () => {
    it('adds profile verification tags for phone, email, and KBZPay', () => {
      const user = buildUser();
      const dto = new UserProfileDto(buildAuthData(user));

      expect(dto.adminRole).toBeNull();
      expect(dto.verificationTags).toEqual([
        expect.objectContaining({
          type: ProfileVerificationTagType.PHONE,
          label: 'Phone',
          value: user.phone,
          status: ProfileVerificationTagStatus.UNVERIFIED,
          isVerified: false,
          canVerifyFromProfile: true,
          action: ProfileVerificationTagAction.SEND_PHONE_OTP,
          verifiedAt: null,
        }),
        expect.objectContaining({
          type: ProfileVerificationTagType.EMAIL,
          label: 'Email',
          value: user.email,
          status: ProfileVerificationTagStatus.UNVERIFIED,
          isVerified: false,
          canVerifyFromProfile: true,
          action: ProfileVerificationTagAction.SEND_EMAIL_VERIFICATION,
          verifiedAt: null,
        }),
        expect.objectContaining({
          type: ProfileVerificationTagType.KBZPAY,
          label: 'KBZPay',
          value: '+959876543210',
          status: ProfileVerificationTagStatus.UNVERIFIED,
          isVerified: false,
          canVerifyFromProfile: true,
          action: ProfileVerificationTagAction.REQUEST_KBZPAY_VERIFICATION,
          verifiedAt: null,
        }),
      ]);
    });

    it('marks KBZPay as pending after a verification request is made', () => {
      const user = buildUser({
        isPhoneVerified: true,
        isEmailVerified: true,
      });
      const authData = buildAuthData(user);
      authData.kbzPayAccount = {
        ...authData.kbzPayAccount!,
        verifyRequestedAt: new Date('2026-01-02'),
      };

      const dto = new UserProfileDto(authData);

      expect(dto.verificationTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: ProfileVerificationTagType.KBZPAY,
            status: ProfileVerificationTagStatus.PENDING,
            isVerified: false,
            canVerifyFromProfile: false,
            action: null,
          }),
        ]),
      );
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
          clientReference: expect.stringMatching(/^phone-otp:user-1:\d+$/),
        }),
      );
    });

    it('VerifyPhoneOtpUseCase verifies correct code', async () => {
      const repo = buildRepoMock();
      repo.findLatestActivePhoneOtp.mockResolvedValue({
        id: 'otp1',
        phone: '+959123456789',
        code: '123456',
        purpose: OtpPurpose.PHONE_VERIFICATION,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        maxAttempts: 5,
      });
      repo.findByPhone.mockResolvedValue(buildUser({ id: 'user-1' }));
      const pointsRepo = buildPointsRepoMock();
      const useCase = new VerifyPhoneOtpUseCase(repo, pointsRepo);
      const res = await useCase.execute({
        phone: '+959123456789',
        code: '123456',
      });
      expect(res.action).toBe('PHONE_VERIFIED');
      expect(repo.markPhoneOtpVerified).toHaveBeenCalledWith('otp1');
      expect(repo.markUserPhoneVerified).toHaveBeenCalledWith('+959123456789');
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).toHaveBeenCalledWith('user-1', PointSourceType.PHONE_VERIFIED_BONUS);
    });

    it('RequestForgotPasswordUseCase sends PASSWORD_RESET OTP', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      const useCase = new RequestForgotPasswordUseCase(
        repo,
        emailSender,
        smsSender,
      );
      const res = await useCase.execute({ phone: '+959123456789' });
      expect(res.action).toBe('PASSWORD_RESET_OTP_SENT');
      expect(repo.createPhoneOtp).toHaveBeenCalledWith(
        '+959123456789',
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
        OtpPurpose.PASSWORD_RESET,
      );
      expect(smsSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/password reset code is \d{6}/),
          clientReference: expect.stringMatching(
            /^password-reset:user-1:\d+$/,
          ),
        }),
      );
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    it('RequestForgotPasswordUseCase sends password reset code via email', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      repo.findByEmail.mockResolvedValue(buildUser({ email: 'john@example.com' }));
      const useCase = new RequestForgotPasswordUseCase(
        repo,
        emailSender,
        smsSender,
      );
      const res = await useCase.execute({ email: 'john@example.com' });
      expect(res.action).toBe('PASSWORD_RESET_OTP_SENT');
      expect(repo.createEmailVerification).toHaveBeenCalledWith(
        'john@example.com',
        expect.stringMatching(/^pwd-reset:\d{6}$/),
        expect.any(Date),
      );
      expect(emailSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'Reset your password',
        }),
      );
      expect(smsSender.send).not.toHaveBeenCalled();
    });

    it('RequestForgotPasswordUseCase rejects when both phone and email are provided', async () => {
      const repo = buildRepoMock();
      const emailSender = buildEmailSenderMock();
      const smsSender = buildSmsSenderMock();
      const useCase = new RequestForgotPasswordUseCase(
        repo,
        emailSender,
        smsSender,
      );
      await expect(
        useCase.execute({
          phone: '+959123456789',
          email: 'john@example.com',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ResetPasswordUseCase updates password and does not verify phone', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(buildUser({ id: 'user-1' }));
      repo.findLatestActivePhoneOtp.mockResolvedValue({
        id: 'otp-reset',
        phone: '+959123456789',
        code: '654321',
        purpose: OtpPurpose.PASSWORD_RESET,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        maxAttempts: 5,
      });
      const useCase = new ResetPasswordUseCase(repo);
      const res = await useCase.execute({
        phone: '+959123456789',
        code: '654321',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });
      expect(res.action).toBe('PASSWORD_RESET');
      expect(repo.markPhoneOtpVerified).toHaveBeenCalledWith('otp-reset');
      expect(repo.markUserPhoneVerified).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
    });

    it('ResetPasswordUseCase rejects password mismatch', async () => {
      const repo = buildRepoMock();
      repo.findByPhone.mockResolvedValue(buildUser());
      const useCase = new ResetPasswordUseCase(repo);
      await expect(
        useCase.execute({
          phone: '+959123456789',
          code: '654321',
          newPassword: 'newpass123',
          confirmNewPassword: 'different',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ResetPasswordUseCase updates password with email reset code', async () => {
      const repo = buildRepoMock();
      repo.findByEmail.mockResolvedValue(
        buildUser({ id: 'user-email', email: 'john@example.com' }),
      );
      repo.findActiveEmailVerification.mockResolvedValue({
        id: 'ev-reset',
        email: 'john@example.com',
        token: 'pwd-reset:654321',
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const useCase = new ResetPasswordUseCase(repo);
      const res = await useCase.execute({
        email: 'john@example.com',
        code: '654321',
        newPassword: 'newpass123',
        confirmNewPassword: 'newpass123',
      });

      expect(res.action).toBe('PASSWORD_RESET');
      expect(repo.markEmailVerificationVerified).toHaveBeenCalledWith(
        'ev-reset',
      );
      expect(repo.update).toHaveBeenCalledWith(
        'user-email',
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
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
      repo.findByEmail.mockResolvedValue(buildUser({ id: 'user-1' }));
      const pointsRepo = buildPointsRepoMock();
      const useCase = new VerifyEmailVerificationUseCase(repo, pointsRepo);
      const res = await useCase.execute({
        email: 'john@example.com',
        token: 'tok',
      });
      expect(res.action).toBe('EMAIL_VERIFIED');
      expect(repo.markEmailVerificationVerified).toHaveBeenCalledWith('ev1');
      expect(repo.markUserEmailVerified).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).toHaveBeenCalledWith('user-1', PointSourceType.EMAIL_VERIFIED_BONUS);
    });

    it('KBZPay request sets pending and notifies user', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      repo.getAuthDataByUserId.mockResolvedValue(buildAuthData(user));
      repo.findAdminUserIds.mockResolvedValue(['admin-1']);
      const useCase = new RequestKbzPayVerificationUseCase(repo);
      const res = await useCase.execute('user-1', { message: 'pls' });
      expect(res.action).toBe('KBZPAY_VERIFICATION_REQUESTED');
      expect(repo.requestKbzPayVerification).toHaveBeenCalledWith('user-1');
      expect(repo.createNotification).toHaveBeenCalledTimes(2);
      expect(repo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          eventKey: 'KBZPAY_VERIFICATION_REQUESTED_ADMIN',
        }),
      );
      expect(repo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventKey: 'KBZPAY_VERIFICATION_REQUESTED_CLIENT',
        }),
      );
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

      await expect(useCase.execute('user-1', {})).rejects.toBeInstanceOf(
        ConflictException,
      );
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

    it('KBZPay transaction submission saves submitted transaction number', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      const authData = buildAuthData(user);
      authData.kbzPayAccount = {
        ...authData.kbzPayAccount!,
        verifyRequestedAt: new Date('2026-01-02'),
        adminPhoneForTransfer: '+959700000000',
        adminInstructionSentAt: new Date('2026-01-03'),
      };
      repo.getAuthDataByUserId.mockResolvedValue(authData);
      const useCase = new SubmitKbzPayTransactionUseCase(repo);

      const res = await useCase.execute('user-1', {
        kbzTransactionId: 'KBZ-TXN-10001',
      });

      expect(res.action).toBe('KBZPAY_TRANSACTION_SUBMITTED');
      expect(repo.setKbzPayTransactionId).toHaveBeenCalledWith(
        'user-1',
        'KBZ-TXN-10001',
      );
    });

    it('KBZPay transaction submission rejects when request not created first', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      const authData = buildAuthData(user);
      authData.kbzPayAccount = {
        ...authData.kbzPayAccount!,
        verifyRequestedAt: null,
      };
      repo.getAuthDataByUserId.mockResolvedValue(authData);
      const useCase = new SubmitKbzPayTransactionUseCase(repo);

      await expect(
        useCase.execute('user-1', { kbzTransactionId: 'KBZ-TXN-10001' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.setKbzPayTransactionId).not.toHaveBeenCalled();
    });

    it('KBZPay transaction submission rejects before admin instruction is sent', async () => {
      const repo = buildRepoMock();
      const user = buildUser({ id: 'user-1' });
      const authData = buildAuthData(user);
      authData.kbzPayAccount = {
        ...authData.kbzPayAccount!,
        verifyRequestedAt: new Date('2026-01-02'),
        adminPhoneForTransfer: null,
        adminInstructionSentAt: null,
      };
      repo.getAuthDataByUserId.mockResolvedValue(authData);
      const useCase = new SubmitKbzPayTransactionUseCase(repo);

      await expect(
        useCase.execute('user-1', { kbzTransactionId: 'KBZ-TXN-10001' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.setKbzPayTransactionId).not.toHaveBeenCalled();
    });

    it('Admin KBZPay instruction requires admin user', async () => {
      const repo = buildRepoMock();
      repo.findById.mockImplementation(async (id: string) => {
        if (id === 'admin-1') return buildUser({ id, adminRoleId: null });
        return buildUser({ id });
      });
      const useCase = new SendKbzPayInstructionUseCase(repo);

      await expect(
        useCase.execute('admin-1', 'user-1', {
          adminPhoneForTransfer: '+9597000',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('Admin can verify KBZPay when admin', async () => {
      const repo = buildRepoMock();
      repo.findById.mockImplementation(async (id: string) => {
        if (id === 'admin-1') return buildUser({ id, adminRoleId: 'role-1' });
        return buildUser({ id });
      });
      const pointsRepo = buildPointsRepoMock();
      const useCase = new AdminVerifyKbzPayUseCase(repo, pointsRepo);
      const res = await useCase.execute('admin-1', 'user-1', {});
      expect(res.action).toBe('KBZPAY_VERIFIED');
      expect(repo.markKbzPayVerified).toHaveBeenCalledWith(
        'user-1',
        'admin-1',
        undefined,
      );
      expect(
        pointsRepo.grantAccountLifetimeMilestoneBonus,
      ).toHaveBeenCalledWith('user-1', PointSourceType.KBZPAY_VERIFIED_BONUS);
      expect(repo.createNotification).toHaveBeenCalledTimes(1);
      expect(repo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventKey: 'KBZPAY_VERIFIED_CLIENT',
        }),
      );
    });

    it('Admin can list KBZPay verification requested list', async () => {
      const repo = buildRepoMock();
      repo.findById.mockResolvedValue(
        buildUser({ id: 'admin-1', adminRoleId: 'role-1' }),
      );
      repo.findKbzPayVerificationRequested.mockResolvedValue([
        {
          userId: 'user-1',
          nickname: 'Nick',
          phone: '+959111111111',
          email: 'nick@example.com',
          accountName: 'Nick Aung',
          kbzPayPhoneNumber: '+959222222222',
          kbzTransactionId: null,
          status: VerificationStatus.PENDING,
          verifyRequestedAt: new Date('2026-01-02'),
          adminPhoneForTransfer: null,
          adminInstructionSentAt: null,
          adminNote: 'Check transfer screenshot',
        },
      ]);
      const useCase = new ListKbzPayVerificationRequestedUseCase(repo);

      const rows = await useCase.execute('admin-1');

      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe('user-1');
      expect(repo.findKbzPayVerificationRequested).toHaveBeenCalledTimes(1);
    });
  });
});
