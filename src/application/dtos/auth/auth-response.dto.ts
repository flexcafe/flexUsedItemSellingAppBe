import { ApiProperty } from '@nestjs/swagger';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../../domain/enums/marital-status.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { UserAuthData } from '../../../domain/repositories/user.repository.interface.js';

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
}

export class ProfileDetailsDto {
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

  constructor(data: UserAuthData['profile']) {
    this.gender = data?.gender ?? null;
    this.age = data?.age ?? null;
    this.maritalStatus = data?.maritalStatus ?? null;
    this.region = data?.inputRegion ?? null;
    this.gpsLatitude = data?.gpsLatitude ?? null;
    this.gpsLongitude = data?.gpsLongitude ?? null;
    this.isRegionVerified = data?.isRegionVerified ?? false;
  }
}

export class KbzPayDetailsDto {
  @ApiProperty({ nullable: true })
  accountName: string | null;

  @ApiProperty({ nullable: true })
  phoneNumber: string | null;

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
    this.status = data?.status ?? null;
    this.isVerified = data?.isVerified ?? false;
    this.adminPhoneForTransfer = data?.adminPhoneForTransfer ?? null;
    this.adminNote = data?.adminNote ?? null;
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

  constructor(authData: UserAuthData) {
    const { user, profile, kbzPayAccount } = authData;
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
