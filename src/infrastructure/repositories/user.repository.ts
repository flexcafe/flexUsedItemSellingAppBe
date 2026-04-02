import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import type {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.create({ data });
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
}
