import { RegistrationType } from '../enums/registration-type.enum.js';
import { RankTier } from '../enums/rank-tier.enum.js';

export interface UserEntityProps {
  id: string;
  registrationType: RegistrationType;
  phone: string;
  email: string | null;
  password: string;
  nickname: string;
  facebookId: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  totalPoints: number;
  currentRank: RankTier;
  referralCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  readonly id: string;
  readonly registrationType: RegistrationType;
  readonly phone: string;
  readonly email: string | null;
  readonly password: string;
  readonly nickname: string;
  readonly facebookId: string | null;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
  readonly isActive: boolean;
  readonly isBanned: boolean;
  readonly totalPoints: number;
  readonly currentRank: RankTier;
  readonly referralCode: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserEntityProps) {
    this.id = props.id;
    this.registrationType = props.registrationType;
    this.phone = props.phone;
    this.email = props.email;
    this.password = props.password;
    this.nickname = props.nickname;
    this.facebookId = props.facebookId;
    this.isEmailVerified = props.isEmailVerified;
    this.isPhoneVerified = props.isPhoneVerified;
    this.isActive = props.isActive;
    this.isBanned = props.isBanned;
    this.totalPoints = props.totalPoints;
    this.currentRank = props.currentRank;
    this.referralCode = props.referralCode;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isActiveUser(): boolean {
    return this.isActive && !this.isBanned;
  }

  isVerified(): boolean {
    return this.isPhoneVerified;
  }
}
