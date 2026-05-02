import { UserEntity } from '../entities/user.entity.js';
import { Gender } from '../enums/gender.enum.js';
import { MaritalStatus } from '../enums/marital-status.enum.js';
import { RegistrationType } from '../enums/registration-type.enum.js';
import { VerificationStatus } from '../enums/verification-status.enum.js';

export interface CreateUserData {
  registrationType: RegistrationType;
  phone: string;
  email: string;
  password: string;
  nickname: string;
  facebookId?: string;
  referralCode: string;
  referredById?: string;
  profile: CreateUserProfileData;
  kbzPayAccount: CreateKbzPayAccountData;
}

export interface CreateUserProfileData {
  gender: Gender;
  age: number;
  maritalStatus: MaritalStatus;
  inputRegion: string;
  gpsLatitude: number;
  gpsLongitude: number;
  isRegionVerified: boolean;
  gpsVerifiedAt: Date;
}

export interface CreateKbzPayAccountData {
  accountName: string;
  phoneNumber: string;
}

export interface UpdateUserData {
  email?: string | null;
  password?: string;
  nickname?: string;
  phone?: string;
  isActive?: boolean;
  isBanned?: boolean;
  banReason?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
}

export interface OtpVerificationData {
  id: string;
  phone: string;
  code: string;
  status: VerificationStatus;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

export interface EmailVerificationData {
  id: string;
  email: string;
  token: string;
  status: VerificationStatus;
  expiresAt: Date;
}

export interface UserProfileData {
  gender: Gender | null;
  age: number | null;
  maritalStatus: MaritalStatus | null;
  inputRegion: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  isRegionVerified: boolean;
  gpsVerifiedAt: Date | null;
}

export interface KbzPayAccountData {
  accountName: string;
  phoneNumber: string;
  status: VerificationStatus;
  isVerified: boolean;
  verifyRequestedAt: Date | null;
  adminPhoneForTransfer: string | null;
  adminInstructionSentAt: Date | null;
  verifiedAt: Date | null;
  adminNote: string | null;
}

export interface UserAuthData {
  user: UserEntity;
  profile: UserProfileData | null;
  kbzPayAccount: KbzPayAccountData | null;
}

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  referenceId?: string;
}

export interface IUserRepository {
  create(data: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  findByFacebookId(facebookId: string): Promise<UserEntity | null>;
  findByReferralCode(referralCode: string): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
  delete(id: string): Promise<boolean>;

  createPhoneOtp(phone: string, code: string, expiresAt: Date): Promise<void>;
  findLatestActivePhoneOtp(phone: string): Promise<OtpVerificationData | null>;
  incrementPhoneOtpAttempt(id: string): Promise<void>;
  markPhoneOtpFailed(id: string): Promise<void>;
  markPhoneOtpVerified(id: string): Promise<void>;
  markUserPhoneVerified(phone: string): Promise<void>;

  createEmailVerification(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<void>;
  findActiveEmailVerification(
    email: string,
    token: string,
  ): Promise<EmailVerificationData | null>;
  markEmailVerificationExpired(id: string): Promise<void>;
  markEmailVerificationVerified(id: string): Promise<void>;
  markUserEmailVerified(email: string): Promise<void>;

  requestKbzPayVerification(userId: string): Promise<void>;
  setKbzPayVerificationInstruction(
    userId: string,
    adminPhoneForTransfer: string,
    adminNote?: string,
  ): Promise<void>;
  markKbzPayVerified(
    userId: string,
    verifiedById: string,
    adminNote?: string,
  ): Promise<void>;

  createNotification(data: CreateNotificationData): Promise<void>;
  getAuthDataByUserId(userId: string): Promise<UserAuthData | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
