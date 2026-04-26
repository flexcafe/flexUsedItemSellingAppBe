import type { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../domain/entities/user.entity.js';
import { RegistrationType } from '../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../domain/enums/rank-tier.enum.js';

export class UserMapper {
  static toDomain(prismaUser: PrismaUser): UserEntity {
    return new UserEntity({
      id: prismaUser.id,
      registrationType: prismaUser.registrationType as RegistrationType,
      phone: prismaUser.phone,
      email: prismaUser.email,
      password: prismaUser.password,
      nickname: prismaUser.nickname,
      facebookId: prismaUser.facebookId,
      isEmailVerified: prismaUser.isEmailVerified,
      isPhoneVerified: prismaUser.isPhoneVerified,
      emailVerifiedAt: prismaUser.emailVerifiedAt,
      phoneVerifiedAt: prismaUser.phoneVerifiedAt,
      isActive: prismaUser.isActive,
      isBanned: prismaUser.isBanned,
      totalPoints: prismaUser.totalPoints,
      currentRank: prismaUser.currentRank as RankTier,
      referralCode: prismaUser.referralCode,
      referredById: prismaUser.referredById,
      adminRoleId: prismaUser.adminRoleId,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });
  }

  static toPersistence(entity: Partial<UserEntity>): Partial<PrismaUser> {
    const data: Partial<PrismaUser> = {};
    if (entity.email !== undefined) data.email = entity.email;
    if (entity.password !== undefined) data.password = entity.password;
    if (entity.nickname !== undefined) data.nickname = entity.nickname;
    if (entity.phone !== undefined) data.phone = entity.phone;
    if (entity.isActive !== undefined) data.isActive = entity.isActive;
    if (entity.phoneVerifiedAt !== undefined)
      data.phoneVerifiedAt = entity.phoneVerifiedAt;
    if (entity.emailVerifiedAt !== undefined)
      data.emailVerifiedAt = entity.emailVerifiedAt;
    return data;
  }
}
