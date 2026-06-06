import { ApiProperty } from '@nestjs/swagger';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../../domain/enums/marital-status.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import type {
  UserAdminRoleData,
  UserAuthData,
} from '../../../domain/repositories/user.repository.interface.js';

export enum ProfileVerificationTagType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  KBZPAY = 'KBZPAY',
}

export enum ProfileVerificationTagStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum ProfileVerificationTagAction {
  SEND_PHONE_OTP = 'SEND_PHONE_OTP',
  SEND_EMAIL_VERIFICATION = 'SEND_EMAIL_VERIFICATION',
  REQUEST_KBZPAY_VERIFICATION = 'REQUEST_KBZPAY_VERIFICATION',
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
}

export class ProfileDetailsDto {
  @ApiProperty({ nullable: true })
  avatar: string | null;

  @ApiProperty({ enum: Gender, nullable: true })
  gender: Gender | null;

  @ApiProperty({ nullable: true })
  age: number | null;

  @ApiProperty({ enum: MaritalStatus, nullable: true })
  maritalStatus: MaritalStatus | null;

  @ApiProperty({ nullable: true })
  region: string | null;

  @ApiProperty({ nullable: true })
  gpsLatitude: number | null;

  @ApiProperty({ nullable: true })
  gpsLongitude: number | null;

  @ApiProperty()
  isRegionVerified: boolean;

  @ApiProperty({ nullable: true })
  facebookName: string | null;

  @ApiProperty({ nullable: true })
  facebookProfileUrl: string | null;

  @ApiProperty({ nullable: true })
  facebookLinkedAt: Date | null;

  constructor(data: UserAuthData['profile']) {
    this.avatar = data?.avatar ?? null;
    this.gender = data?.gender ?? null;
    this.age = data?.age ?? null;
    this.maritalStatus = data?.maritalStatus ?? null;
    this.region = data?.inputRegion ?? null;
    this.gpsLatitude = data?.gpsLatitude ?? null;
    this.gpsLongitude = data?.gpsLongitude ?? null;
    this.isRegionVerified = data?.isRegionVerified ?? false;
    this.facebookName = data?.facebookName ?? null;
    this.facebookProfileUrl = data?.facebookProfileUrl ?? null;
    this.facebookLinkedAt = data?.facebookLinkedAt ?? null;
  }
}

export class KbzPayDetailsDto {
  @ApiProperty({ nullable: true })
  accountName: string | null;

  @ApiProperty({ nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ nullable: true })
  kbzTransactionId: string | null;

  @ApiProperty({ enum: VerificationStatus, nullable: true })
  status: VerificationStatus | null;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ nullable: true })
  adminPhoneForTransfer: string | null;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  constructor(data: UserAuthData['kbzPayAccount']) {
    this.accountName = data?.accountName ?? null;
    this.phoneNumber = data?.phoneNumber ?? null;
    this.kbzTransactionId = data?.kbzTransactionId ?? null;
    this.status = data?.status ?? null;
    this.isVerified = data?.isVerified ?? false;
    this.adminPhoneForTransfer = data?.adminPhoneForTransfer ?? null;
    this.adminNote = data?.adminNote ?? null;
  }
}

type ProfileVerificationTagInput = {
  type: ProfileVerificationTagType;
  label: string;
  value: string | null;
  status: ProfileVerificationTagStatus;
  isVerified: boolean;
  canVerifyFromProfile: boolean;
  action: ProfileVerificationTagAction | null;
  verifiedAt: Date | null;
};

export class ProfileVerificationTagDto {
  @ApiProperty({ enum: ProfileVerificationTagType })
  type: ProfileVerificationTagType;

  @ApiProperty()
  label: string;

  @ApiProperty({ nullable: true })
  value: string | null;

  @ApiProperty({ enum: ProfileVerificationTagStatus })
  status: ProfileVerificationTagStatus;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  canVerifyFromProfile: boolean;

  @ApiProperty({ enum: ProfileVerificationTagAction, nullable: true })
  action: ProfileVerificationTagAction | null;

  @ApiProperty({ nullable: true })
  verifiedAt: Date | null;

  constructor(data: ProfileVerificationTagInput) {
    this.type = data.type;
    this.label = data.label;
    this.value = data.value;
    this.status = data.status;
    this.isVerified = data.isVerified;
    this.canVerifyFromProfile = data.canVerifyFromProfile;
    this.action = data.action;
    this.verifiedAt = data.verifiedAt;
  }
}

export class AdminAuthRoleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty({ enum: AdminPermission, isArray: true })
  permissions: AdminPermission[];

  constructor(role: UserAdminRoleData) {
    this.id = role.id;
    this.name = role.name;
    this.isSystem = role.isSystem;
    this.permissions = role.permissions;
  }
}

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: RegistrationType })
  registrationType: RegistrationType;

  @ApiProperty()
  nickname: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  facebookId: string | null;

  @ApiProperty()
  isPhoneVerified: boolean;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty({ nullable: true })
  phoneVerifiedAt: Date | null;

  @ApiProperty({ nullable: true })
  emailVerifiedAt: Date | null;

  @ApiProperty()
  currentRank: string;

  @ApiProperty()
  totalPoints: number;

  @ApiProperty()
  referralCode: string;

  @ApiProperty({ nullable: true })
  referredById: string | null;

  @ApiProperty({ type: ProfileDetailsDto })
  profile: ProfileDetailsDto;

  @ApiProperty({ type: KbzPayDetailsDto })
  kbzPay: KbzPayDetailsDto;

  @ApiProperty({ type: AdminAuthRoleDto, nullable: true })
  adminRole: AdminAuthRoleDto | null;

  @ApiProperty({ type: ProfileVerificationTagDto, isArray: true })
  verificationTags: ProfileVerificationTagDto[];

  constructor(authData: UserAuthData) {
    const { user, profile, kbzPayAccount, adminRole } = authData;
    this.id = user.id;
    this.registrationType = user.registrationType;
    this.nickname = user.nickname;
    this.email = user.email;
    this.phone = user.phone;
    this.facebookId = user.facebookId;
    this.isPhoneVerified = user.isPhoneVerified;
    this.isEmailVerified = user.isEmailVerified;
    this.phoneVerifiedAt = user.phoneVerifiedAt;
    this.emailVerifiedAt = user.emailVerifiedAt;
    this.currentRank = user.currentRank;
    this.totalPoints = user.totalPoints;
    this.referralCode = user.referralCode;
    this.referredById = user.referredById;
    this.profile = new ProfileDetailsDto(profile);
    this.kbzPay = new KbzPayDetailsDto(kbzPayAccount);
    this.adminRole = adminRole ? new AdminAuthRoleDto(adminRole) : null;
    this.verificationTags = [
      new ProfileVerificationTagDto({
        type: ProfileVerificationTagType.PHONE,
        label: 'Phone',
        value: user.phone,
        status: user.isPhoneVerified
          ? ProfileVerificationTagStatus.VERIFIED
          : ProfileVerificationTagStatus.UNVERIFIED,
        isVerified: user.isPhoneVerified,
        canVerifyFromProfile: !user.isPhoneVerified,
        action: user.isPhoneVerified
          ? null
          : ProfileVerificationTagAction.SEND_PHONE_OTP,
        verifiedAt: user.phoneVerifiedAt,
      }),
      new ProfileVerificationTagDto({
        type: ProfileVerificationTagType.EMAIL,
        label: 'Email',
        value: user.email,
        status: user.isEmailVerified
          ? ProfileVerificationTagStatus.VERIFIED
          : ProfileVerificationTagStatus.UNVERIFIED,
        isVerified: user.isEmailVerified,
        canVerifyFromProfile: !user.isEmailVerified && user.email !== null,
        action:
          user.isEmailVerified || user.email === null
            ? null
            : ProfileVerificationTagAction.SEND_EMAIL_VERIFICATION,
        verifiedAt: user.emailVerifiedAt,
      }),
      new ProfileVerificationTagDto({
        type: ProfileVerificationTagType.KBZPAY,
        label: 'KBZPay',
        value: kbzPayAccount?.phoneNumber ?? null,
        status: this.getKbzPayVerificationTagStatus(kbzPayAccount),
        isVerified: kbzPayAccount?.isVerified ?? false,
        canVerifyFromProfile: this.canVerifyKbzPayFromProfile(kbzPayAccount),
        action: this.canVerifyKbzPayFromProfile(kbzPayAccount)
          ? ProfileVerificationTagAction.REQUEST_KBZPAY_VERIFICATION
          : null,
        verifiedAt: kbzPayAccount?.verifiedAt ?? null,
      }),
    ];
  }

  private getKbzPayVerificationTagStatus(
    data: UserAuthData['kbzPayAccount'],
  ): ProfileVerificationTagStatus {
    if (!data) {
      return ProfileVerificationTagStatus.UNVERIFIED;
    }
    if (data.isVerified) {
      return ProfileVerificationTagStatus.VERIFIED;
    }
    if (data.status === VerificationStatus.FAILED) {
      return ProfileVerificationTagStatus.FAILED;
    }
    if (data.status === VerificationStatus.EXPIRED) {
      return ProfileVerificationTagStatus.EXPIRED;
    }
    if (data.verifyRequestedAt || data.adminInstructionSentAt) {
      return ProfileVerificationTagStatus.PENDING;
    }

    return ProfileVerificationTagStatus.UNVERIFIED;
  }

  private canVerifyKbzPayFromProfile(
    data: UserAuthData['kbzPayAccount'],
  ): boolean {
    if (!data || data.isVerified) {
      return false;
    }

    return (
      !data.verifyRequestedAt || data.status !== VerificationStatus.PENDING
    );
  }
}

export class AuthResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;

  constructor(user: UserProfileDto, tokens: AuthTokensDto) {
    this.user = user;
    this.tokens = tokens;
  }
}
