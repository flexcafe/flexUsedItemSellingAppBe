import { Injectable } from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import type {
  CreateNotificationData,
  CreateUserData,
  EmailVerificationData,
  IUserRepository,
  KbzPayAccountData,
  OtpVerificationData,
  UpdateUserData,
  UserAuthData,
  UserProfileData,
} from '../../domain/repositories/user.repository.interface.js';
import { Gender } from '../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../domain/enums/marital-status.enum.js';
import { VerificationStatus } from '../../domain/enums/verification-status.enum.js';

const { NotificationType, VerificationStatus: PrismaVerificationStatus } =
  PrismaPkg;

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async delete(id: string): Promise<boolean> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return true;
  }

  async createPhoneOtp(
    phone: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.otpVerification.updateMany({
        where: {
          phone,
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
          expiresAt,
          status: PrismaVerificationStatus.PENDING,
        },
      }),
    ]);
  }

  async findLatestActivePhoneOtp(
    phone: string,
  ): Promise<OtpVerificationData | null> {
    const otp = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
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
    await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
        type: NotificationType.SYSTEM,
      },
    });
  }

  async getAuthDataByUserId(userId: string): Promise<UserAuthData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kbzPayAccount: true,
      },
    });

    if (!user) {
      return null;
    }

    const profile: UserProfileData | null = user.profile
      ? {
          gender: user.profile.gender as Gender | null,
          age: user.profile.age,
          maritalStatus: user.profile.maritalStatus as MaritalStatus | null,
          inputRegion: user.profile.inputRegion,
          gpsLatitude: user.profile.gpsLatitude,
          gpsLongitude: user.profile.gpsLongitude,
          isRegionVerified: user.profile.isRegionVerified,
          gpsVerifiedAt: user.profile.gpsVerifiedAt,
        }
      : null;

    const kbzPayAccount: KbzPayAccountData | null = user.kbzPayAccount
      ? {
          accountName: user.kbzPayAccount.accountName,
          phoneNumber: user.kbzPayAccount.phoneNumber,
          status: user.kbzPayAccount.status as VerificationStatus,
          isVerified: user.kbzPayAccount.isVerified,
          verifyRequestedAt: user.kbzPayAccount.verifyRequestedAt,
          adminPhoneForTransfer: user.kbzPayAccount.adminPhoneForTransfer,
          adminInstructionSentAt: user.kbzPayAccount.adminInstructionSentAt,
          verifiedAt: user.kbzPayAccount.verifiedAt,
          adminNote: user.kbzPayAccount.adminNote,
        }
      : null;

    return {
      user: UserMapper.toDomain(user),
      profile,
      kbzPayAccount,
    };
  }
}
