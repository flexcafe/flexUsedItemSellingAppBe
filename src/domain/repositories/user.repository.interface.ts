import { UserEntity } from '../entities/user.entity.js';
import { RegistrationType } from '../enums/registration-type.enum.js';

export interface CreateUserData {
  registrationType: RegistrationType;
  phone: string;
  email?: string;
  password: string;
  nickname: string;
  facebookId?: string;
  referralCode: string;
  referredById?: string;
}

export interface UpdateUserData {
  email?: string | null;
  password?: string;
  nickname?: string;
  phone?: string;
  isActive?: boolean;
  isBanned?: boolean;
  banReason?: string | null;
}

export interface IUserRepository {
  create(data: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  findByFacebookId(facebookId: string): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
  delete(id: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
