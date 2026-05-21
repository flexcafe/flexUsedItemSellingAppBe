import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SubmitFraudReportUseCase } from './submit-fraud-report.use-case.js';
import { ConfirmFraudReportUseCase } from './confirm-fraud-report.use-case.js';
import { FraudReportStatus } from '../../../domain/enums/fraud-report-status.enum.js';
import { FraudType } from '../../../domain/enums/fraud-type.enum.js';
import type { IFraudReportRepository } from '../../../domain/repositories/fraud-report.repository.interface.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';

function buildUser(id: string, admin = false) {
  return new UserEntity({
    id,
    registrationType: RegistrationType.PHONE_ONLY,
    phone: '09123456789',
    email: null,
    password: 'hash',
    nickname: 'User',
    facebookId: null,
    isEmailVerified: true,
    isPhoneVerified: true,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    isActive: true,
    isBanned: false,
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: id === 'reporter' ? 'REP11111' : 'BAD22222',
    referredById: null,
    adminRoleId: admin ? 'admin-role' : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe(SubmitFraudReportUseCase.name, () => {
  it('resolves reported user by referral code and notifies admins', async () => {
    const fraudReports = {
      create: jest.fn(async () => ({
        id: 'report-1',
        reporterId: 'reporter',
        reporterNickname: 'R',
        reporterPhone: '09',
        reportedUserId: 'bad-user',
        reportedUserNickname: 'Bad',
        reportedUserPhone: '09',
        fraudUserName: 'Scammer',
        reportedReferralCode: 'BAD22222',
        tradeDate: new Date(),
        tradeTime: '10:00',
        fraudType: FraudType.SCAM,
        details: 'details',
        status: FraudReportStatus.PENDING,
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
        reportedUserIsBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as jest.Mocked<IFraudReportRepository>;

    const users = {
      findById: jest.fn(async (id: string) =>
        id === 'reporter' ? buildUser('reporter') : null,
      ),
      findByReferralCode: jest.fn(async () => buildUser('bad-user')),
      createNotification: jest.fn(),
      findAdminUserIds: jest.fn(async () => ['admin-1']),
    };

    const useCase = new SubmitFraudReportUseCase(fraudReports, users as never);
    await useCase.execute('reporter', {
      fraudUserName: 'Scammer',
      reportedReferralCode: 'BAD22222',
      tradeDate: '2026-05-20',
      tradeTime: '10:00',
      fraudType: FraudType.SCAM,
      details: 'They took my money',
    });

    expect(fraudReports.create).toHaveBeenCalled();
    expect(users.createNotification).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid referral code', async () => {
    const fraudReports = {} as unknown as jest.Mocked<IFraudReportRepository>;
    const users = {
      findById: jest.fn(async () => buildUser('reporter')),
      findByReferralCode: jest.fn(async () => null),
    };
    const useCase = new SubmitFraudReportUseCase(fraudReports, users as never);

    await expect(
      useCase.execute('reporter', {
        fraudUserName: 'X',
        reportedReferralCode: 'NOPE',
        tradeDate: '2026-05-20',
        fraudType: FraudType.SCAM,
        details: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe(ConfirmFraudReportUseCase.name, () => {
  it('bans reported user when blockReportedUser is true', async () => {
    const pending = {
      id: 'report-1',
      reporterId: 'reporter',
      reportedUserId: 'bad-user',
      status: FraudReportStatus.PENDING,
    };
    const fraudReports = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          ...pending,
          reporterNickname: 'R',
          reporterPhone: '09',
          reportedUserNickname: 'B',
          reportedUserPhone: '09',
          fraudUserName: 'S',
          reportedReferralCode: 'BAD22222',
          tradeDate: new Date(),
          tradeTime: null,
          fraudType: FraudType.SCAM,
          details: 'd',
          adminNote: null,
          reviewedById: null,
          reviewedAt: null,
          reportedUserIsBanned: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          ...pending,
          status: FraudReportStatus.CONFIRMED_FRAUD,
          reporterNickname: 'R',
          reporterPhone: '09',
          reportedUserNickname: 'B',
          reportedUserPhone: '09',
          fraudUserName: 'S',
          reportedReferralCode: 'BAD22222',
          tradeDate: new Date(),
          tradeTime: null,
          fraudType: FraudType.SCAM,
          details: 'd',
          adminNote: null,
          reviewedById: 'admin-1',
          reviewedAt: new Date(),
          reportedUserIsBanned: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      review: jest.fn(async () => ({
        id: 'report-1',
        reporterId: 'reporter',
        reporterNickname: 'R',
        reporterPhone: '09',
        reportedUserId: 'bad-user',
        reportedUserNickname: 'B',
        reportedUserPhone: '09',
        fraudUserName: 'S',
        reportedReferralCode: 'BAD22222',
        tradeDate: new Date(),
        tradeTime: null,
        fraudType: FraudType.SCAM,
        details: 'd',
        status: FraudReportStatus.CONFIRMED_FRAUD,
        adminNote: null,
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
        reportedUserIsBanned: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as jest.Mocked<IFraudReportRepository>;

    const users = {
      findById: jest.fn(async (id: string) => {
        if (id === 'admin-1') {
          return new UserEntity({
            ...buildUser('admin-1', true),
          });
        }
        return buildUser('bad-user');
      }),
      setUserBanned: jest.fn(),
      createNotification: jest.fn(),
    };

    const useCase = new ConfirmFraudReportUseCase(fraudReports, users as never);
    await useCase.execute('admin-1', 'report-1', {
      reporterMessage: 'Confirmed',
      blockReportedUser: true,
    });

    expect(users.setUserBanned).toHaveBeenCalledWith(
      'bad-user',
      true,
      expect.any(String),
    );
  });

  it('rejects non-admin', async () => {
    const fraudReports = {} as unknown as jest.Mocked<IFraudReportRepository>;
    const users = {
      findById: jest.fn(async () => buildUser('user')),
    };
    const useCase = new ConfirmFraudReportUseCase(fraudReports, users as never);

    await expect(
      useCase.execute('user', 'report-1', {
        reporterMessage: 'x',
        blockReportedUser: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
