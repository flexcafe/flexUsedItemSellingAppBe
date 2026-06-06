import { Injectable } from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import type {
  CreateNotificationData,
  CreateUserData,
  EmailVerificationData,
  IUserRepository,
  JsonValue,
  KbzPayAccountData,
  NotificationData,
  OtpVerificationData,
  PendingKbzPayVerificationData,
  UpdateUserData,
  UserAdminRoleData,
  UserAuthData,
  UserProfileData,
} from '../../domain/repositories/user.repository.interface.js';
import { Gender } from '../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../domain/enums/marital-status.enum.js';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum.js';
import { VerificationStatus } from '../../domain/enums/verification-status.enum.js';
import { AdminPermission } from '../../domain/enums/admin-permission.enum.js';
import { PusherService } from '../realtime/pusher.service.js';

const {
  NotificationType,
  OtpPurpose: PrismaOtpPurpose,
  VerificationStatus: PrismaVerificationStatus,
} = PrismaPkg;

type UserWithAuthIncludes = Prisma.UserGetPayload<{
  include: {
    profile: true;
    kbzPayAccount: true;
    adminRole: { include: { permissions: true } };
  };
}>;

type PendingKbzPayVerificationRow = Prisma.KbzPayAccountGetPayload<{
  include: {
    user: { select: { id: true; nickname: true; phone: true; email: true } };
  };
}>;

type NotificationRow = Prisma.NotificationGetPayload<object>;

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        registrationType: data.registrationType,
        phone: data.phone,
        email: data.email,
        password: data.password,
        nickname: data.nickname,
        facebookId: data.facebookId,
        referralCode: data.referralCode,
        referredById: data.referredById,
        profile: {
          create: {
            gender: data.profile.gender,
            age: data.profile.age,
            maritalStatus: data.profile.maritalStatus,
            inputRegion: data.profile.inputRegion,
            gpsLatitude: data.profile.gpsLatitude,
            gpsLongitude: data.profile.gpsLongitude,
            isRegionVerified: data.profile.isRegionVerified,
            gpsVerifiedAt: data.profile.gpsVerifiedAt,
          },
        },
        kbzPayAccount: {
          create: {
            accountName: data.kbzPayAccount.accountName,
            phoneNumber: data.kbzPayAccount.phoneNumber,
            status: PrismaVerificationStatus.PENDING,
            isVerified: false,
          },
        },
      },
    });

    return UserMapper.toDomain(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByFacebookId(facebookId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { facebookId } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByReferralCode(referralCode: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { referralCode } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
    });
    return users.map((u) => UserMapper.toDomain(u));
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return UserMapper.toDomain(user);
  }

  async setUserBanned(
    userId: string,
    banned: boolean,
    banReason?: string | null,
  ): Promise<UserEntity> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { authTokenVersion: true },
    });
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: banned
        ? {
            isBanned: true,
            banReason: banReason ?? null,
            bannedAt: new Date(),
            authTokenVersion: (current?.authTokenVersion ?? 0) + 1,
          }
        : {
            isBanned: false,
            banReason: null,
            bannedAt: null,
            authTokenVersion: (current?.authTokenVersion ?? 0) + 1,
          },
    });
    return UserMapper.toDomain(user);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return true;
  }

  async getProfileAvatarUrl(userId: string): Promise<string | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { avatar: true },
    });
    return row?.avatar ?? null;
  }

  async setProfileAvatar(
    userId: string,
    avatarUrl: string | null,
  ): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: { avatar: avatarUrl },
    });
  }

  async createPhoneOtp(
    phone: string,
    code: string,
    expiresAt: Date,
    purpose: OtpPurpose = OtpPurpose.PHONE_VERIFICATION,
  ): Promise<void> {
    const prismaPurpose =
      purpose === OtpPurpose.PASSWORD_RESET
        ? PrismaOtpPurpose.PASSWORD_RESET
        : PrismaOtpPurpose.PHONE_VERIFICATION;

    await this.prisma.$transaction([
      this.prisma.otpVerification.updateMany({
        where: {
          phone,
          purpose: prismaPurpose,
          status: PrismaVerificationStatus.PENDING,
        },
        data: {
          status: PrismaVerificationStatus.EXPIRED,
        },
      }),
      this.prisma.otpVerification.create({
        data: {
          phone,
          code,
          purpose: prismaPurpose,
          expiresAt,
          status: PrismaVerificationStatus.PENDING,
        },
      }),
    ]);
  }

  async findLatestActivePhoneOtp(
    phone: string,
    purpose: OtpPurpose = OtpPurpose.PHONE_VERIFICATION,
  ): Promise<OtpVerificationData | null> {
    const prismaPurpose =
      purpose === OtpPurpose.PASSWORD_RESET
        ? PrismaOtpPurpose.PASSWORD_RESET
        : PrismaOtpPurpose.PHONE_VERIFICATION;

    const otp = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose: prismaPurpose,
        status: PrismaVerificationStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      return null;
    }

    return {
      id: otp.id,
      phone: otp.phone,
      code: otp.code,
      purpose: otp.purpose as OtpPurpose,
      status: otp.status as VerificationStatus,
      expiresAt: otp.expiresAt,
      attempts: otp.attempts,
      maxAttempts: otp.maxAttempts,
    };
  }

  async incrementPhoneOtpAttempt(id: string): Promise<void> {
    await this.prisma.otpVerification.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async markPhoneOtpFailed(id: string): Promise<void> {
    await this.prisma.otpVerification.update({
      where: { id },
      data: {
        status: PrismaVerificationStatus.FAILED,
      },
    });
  }

  async markPhoneOtpVerified(id: string): Promise<void> {
    await this.prisma.otpVerification.update({
      where: { id },
      data: {
        status: PrismaVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }

  async markUserPhoneVerified(phone: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { phone },
      data: {
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    });
  }

  async createEmailVerification(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.emailVerification.updateMany({
        where: {
          email,
          status: PrismaVerificationStatus.PENDING,
        },
        data: {
          status: PrismaVerificationStatus.EXPIRED,
        },
      }),
      this.prisma.emailVerification.create({
        data: {
          email,
          token,
          expiresAt,
          status: PrismaVerificationStatus.PENDING,
        },
      }),
    ]);
  }

  async findActiveEmailVerification(
    email: string,
    token: string,
  ): Promise<EmailVerificationData | null> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        token,
        status: PrismaVerificationStatus.PENDING,
      },
    });

    if (!verification) {
      return null;
    }

    return {
      id: verification.id,
      email: verification.email,
      token: verification.token,
      status: verification.status as VerificationStatus,
      expiresAt: verification.expiresAt,
    };
  }

  async markEmailVerificationExpired(id: string): Promise<void> {
    await this.prisma.emailVerification.update({
      where: { id },
      data: {
        status: PrismaVerificationStatus.EXPIRED,
      },
    });
  }

  async markEmailVerificationVerified(id: string): Promise<void> {
    await this.prisma.emailVerification.update({
      where: { id },
      data: {
        status: PrismaVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }

  async markUserEmailVerified(email: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  async requestKbzPayVerification(userId: string): Promise<void> {
    await this.prisma.kbzPayAccount.update({
      where: { userId },
      data: {
        status: PrismaVerificationStatus.PENDING,
        isVerified: false,
        verifyRequestedAt: new Date(),
      },
    });
  }

  async setKbzPayTransactionId(
    userId: string,
    kbzTransactionId: string,
  ): Promise<void> {
    await this.prisma.kbzPayAccount.update({
      where: { userId },
      data: {
        kbzTransactionId,
      } as Prisma.KbzPayAccountUpdateInput,
    });
  }

  async setKbzPayVerificationInstruction(
    userId: string,
    adminPhoneForTransfer: string,
    adminNote?: string,
  ): Promise<void> {
    await this.prisma.kbzPayAccount.update({
      where: { userId },
      data: {
        adminPhoneForTransfer,
        adminInstructionSentAt: new Date(),
        status: PrismaVerificationStatus.PENDING,
        adminNote: adminNote ?? null,
      },
    });
  }

  async markKbzPayVerified(
    userId: string,
    verifiedById: string,
    adminNote?: string,
  ): Promise<void> {
    await this.prisma.kbzPayAccount.update({
      where: { userId },
      data: {
        status: PrismaVerificationStatus.VERIFIED,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById,
        adminNote: adminNote ?? null,
      },
    });
  }

  async createNotification(data: CreateNotificationData): Promise<void> {
    const row = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        eventKey: data.eventKey ?? null,
        metadata:
          (data.metadata as Prisma.InputJsonValue | undefined) ??
          PrismaPkg.Prisma.JsonNull,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
        type: NotificationType.SYSTEM,
      },
    });

    await this.pusher.trigger(
      `private-user-${data.userId}`,
      'notification.created',
      {
        id: row.id,
        userId: row.userId,
        type: String(row.type),
        eventKey:
          (row as unknown as { eventKey?: string | null }).eventKey ?? null,
        metadata:
          (row as unknown as { metadata?: JsonValue | null }).metadata ?? null,
        title: row.title,
        message: row.message,
        referenceId: row.referenceId,
        isRead: row.isRead,
        createdAt: row.createdAt,
      },
    );
  }

  async listAdminUsers(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { adminRoleId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => UserMapper.toDomain(u));
  }

  async findAdminUserIds(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { adminRoleId: { not: null }, isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async listNotificationsByUserId(
    userId: string,
    limit: number,
  ): Promise<NotificationData[]> {
    const take = Math.max(1, Math.min(limit, 50));
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((n: NotificationRow) => ({
      id: n.id,
      userId: n.userId,
      type: String(n.type),
      eventKey: (n as unknown as { eventKey?: string | null }).eventKey ?? null,
      metadata:
        (n as unknown as { metadata?: JsonValue | null }).metadata ?? null,
      title: n.title,
      message: n.message,
      referenceId: n.referenceId,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  async markNotificationRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async getAuthDataByUserId(userId: string): Promise<UserAuthData | null> {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kbzPayAccount: true,
        adminRole: {
          include: {
            permissions: true,
          },
        },
      },
    })) as UserWithAuthIncludes | null;

    if (!user) {
      return null;
    }

    const profile: UserProfileData | null = user.profile
      ? {
          avatar: user.profile.avatar,
          gender: user.profile.gender as Gender | null,
          age: user.profile.age,
          maritalStatus: user.profile.maritalStatus as MaritalStatus | null,
          inputRegion: user.profile.inputRegion,
          gpsLatitude: user.profile.gpsLatitude,
          gpsLongitude: user.profile.gpsLongitude,
          isRegionVerified: user.profile.isRegionVerified,
          gpsVerifiedAt: user.profile.gpsVerifiedAt,
          facebookName: user.profile.facebookName,
          facebookProfileUrl: user.profile.facebookProfileUrl,
          facebookLinkedAt: user.profile.facebookLinkedAt,
        }
      : null;

    const kbzRow = user.kbzPayAccount as
      | (typeof user.kbzPayAccount & { kbzTransactionId?: string | null })
      | null;

    const kbzPayAccount: KbzPayAccountData | null = kbzRow
      ? {
          accountName: kbzRow.accountName,
          phoneNumber: kbzRow.phoneNumber,
          kbzTransactionId: kbzRow.kbzTransactionId ?? null,
          status: kbzRow.status as VerificationStatus,
          isVerified: kbzRow.isVerified,
          verifyRequestedAt: kbzRow.verifyRequestedAt,
          adminPhoneForTransfer: kbzRow.adminPhoneForTransfer,
          adminInstructionSentAt: kbzRow.adminInstructionSentAt,
          verifiedAt: kbzRow.verifiedAt,
          adminNote: kbzRow.adminNote,
      }
      : null;

    const adminRole: UserAdminRoleData | null = user.adminRole
      ? {
          id: user.adminRole.id,
          name: user.adminRole.name,
          isSystem: user.adminRole.isSystem,
          permissions: user.adminRole.permissions.map(
            (row) => row.permission as AdminPermission,
          ),
        }
      : null;

    return {
      user: UserMapper.toDomain(user),
      profile,
      kbzPayAccount,
      adminRole,
    };
  }

  async getAdminRoleByUserId(
    userId: string,
  ): Promise<UserAdminRoleData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        adminRole: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user?.adminRole) {
      return null;
    }

    return {
      id: user.adminRole.id,
      name: user.adminRole.name,
      isSystem: user.adminRole.isSystem,
      permissions: user.adminRole.permissions.map(
        (row) => row.permission as AdminPermission,
      ),
    };
  }

  async findKbzPayVerificationRequested(): Promise<
    PendingKbzPayVerificationData[]
  > {
    const rows = (await this.prisma.kbzPayAccount.findMany({
      where: {
        isVerified: false,
        verifyRequestedAt: { not: null },
        adminInstructionSentAt: null,
      },
      include: {
        user: {
          select: { id: true, nickname: true, phone: true, email: true },
        },
      },
      orderBy: [{ verifyRequestedAt: 'desc' }, { createdAt: 'desc' }],
    })) as PendingKbzPayVerificationRow[];
    return rows.map((row) => ({
      userId: row.userId,
      nickname: row.user.nickname,
      phone: row.user.phone,
      email: row.user.email,
      accountName: row.accountName,
      kbzPayPhoneNumber: row.phoneNumber,
      kbzTransactionId:
        (row as typeof row & { kbzTransactionId?: string | null })
          .kbzTransactionId ?? null,
      status: row.status as VerificationStatus,
      verifyRequestedAt: row.verifyRequestedAt,
      adminPhoneForTransfer: row.adminPhoneForTransfer,
      adminInstructionSentAt: row.adminInstructionSentAt,
      adminNote: row.adminNote,
    }));
  }

  async findKbzPayMoneyCheckList(): Promise<PendingKbzPayVerificationData[]> {
    const rows = (await this.prisma.kbzPayAccount.findMany({
      where: {
        isVerified: false,
        kbzTransactionId: { not: null },
      },
      include: {
        user: {
          select: { id: true, nickname: true, phone: true, email: true },
        },
      },
      orderBy: [{ adminInstructionSentAt: 'desc' }, { createdAt: 'desc' }],
    })) as PendingKbzPayVerificationRow[];
    return rows.map((row) => ({
      userId: row.userId,
      nickname: row.user.nickname,
      phone: row.user.phone,
      email: row.user.email,
      accountName: row.accountName,
      kbzPayPhoneNumber: row.phoneNumber,
      kbzTransactionId:
        (row as typeof row & { kbzTransactionId?: string | null })
          .kbzTransactionId ?? null,
      status: row.status as VerificationStatus,
      verifyRequestedAt: row.verifyRequestedAt,
      adminPhoneForTransfer: row.adminPhoneForTransfer,
      adminInstructionSentAt: row.adminInstructionSentAt,
      adminNote: row.adminNote,
    }));
  }

  async findKbzPayVerifiedUsers(): Promise<PendingKbzPayVerificationData[]> {
    const rows = (await this.prisma.kbzPayAccount.findMany({
      where: { isVerified: true },
      include: {
        user: {
          select: { id: true, nickname: true, phone: true, email: true },
        },
      },
      orderBy: [{ verifiedAt: 'desc' }, { createdAt: 'desc' }],
    })) as PendingKbzPayVerificationRow[];
    return rows.map((row) => ({
      userId: row.userId,
      nickname: row.user.nickname,
      phone: row.user.phone,
      email: row.user.email,
      accountName: row.accountName,
      kbzPayPhoneNumber: row.phoneNumber,
      kbzTransactionId:
        (row as typeof row & { kbzTransactionId?: string | null })
          .kbzTransactionId ?? null,
      status: row.status as VerificationStatus,
      verifyRequestedAt: row.verifyRequestedAt,
      adminPhoneForTransfer: row.adminPhoneForTransfer,
      adminInstructionSentAt: row.adminInstructionSentAt,
      adminNote: row.adminNote,
    }));
  }

  async findKbzPayRegisteredAccounts(): Promise<
    PendingKbzPayVerificationData[]
  > {
    const rows = (await this.prisma.kbzPayAccount.findMany({
      where: {
        isVerified: false,
        verifyRequestedAt: null,
      },
      include: {
        user: {
          select: { id: true, nickname: true, phone: true, email: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })) as PendingKbzPayVerificationRow[];
    return rows.map((row) => ({
      userId: row.userId,
      nickname: row.user.nickname,
      phone: row.user.phone,
      email: row.user.email,
      accountName: row.accountName,
      kbzPayPhoneNumber: row.phoneNumber,
      kbzTransactionId:
        (row as typeof row & { kbzTransactionId?: string | null })
          .kbzTransactionId ?? null,
      status: row.status as VerificationStatus,
      verifyRequestedAt: row.verifyRequestedAt,
      adminPhoneForTransfer: row.adminPhoneForTransfer,
      adminInstructionSentAt: row.adminInstructionSentAt,
      adminNote: row.adminNote,
    }));
  }
}
