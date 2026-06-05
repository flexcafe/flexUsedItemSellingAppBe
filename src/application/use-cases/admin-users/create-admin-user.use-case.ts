import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  ADMIN_ROLE_REPOSITORY,
  type IAdminRoleRepository,
} from '../../../domain/repositories/admin-role.repository.interface.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import type { CreateAdminUserDto } from '../../dtos/admin-users/create-admin-user.dto.js';
import { AdminUserListDto } from '../../dtos/admin-users/admin-user-list.dto.js';
import { assertRootAdmin } from '../admin-roles/_helpers.js';

@Injectable()
export class CreateAdminUserUseCase {
  private readonly logger = new Logger(CreateAdminUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ADMIN_ROLE_REPOSITORY)
    private readonly adminRoleRepository: IAdminRoleRepository,
  ) {}

  async execute(
    rootAdminId: string,
    dto: CreateAdminUserDto,
  ): Promise<AdminUserListDto> {
    await assertRootAdmin(this.adminRoleRepository, rootAdminId);

    // Validate role exists
    const matchedRole = await this.adminRoleRepository.findById(
      dto.adminRoleId,
    );
    if (!matchedRole) {
      throw new NotFoundException('Admin role not found');
    }

    // Check uniqueness
    const [existingPhone, existingEmail] = await Promise.all([
      this.userRepository.findByPhone(dto.phone),
      this.userRepository.findByEmail(dto.email),
    ]);

    if (existingPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await hash(dto.password, 12);
    const referralCode = await this.generateUniqueReferralCode();

    const createdUser = await this.userRepository.create({
      registrationType: RegistrationType.EMAIL_ONLY,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      nickname: dto.nickname,
      referralCode,
      profile: {
        gender: 'PREFER_NOT_TO_SAY' as any,
        age: 18,
        maritalStatus: 'PREFER_NOT_TO_SAY' as any,
        inputRegion: '',
        gpsLatitude: 0,
        gpsLongitude: 0,
        isRegionVerified: false,
        gpsVerifiedAt: new Date(),
      },
      kbzPayAccount: {
        accountName: dto.nickname,
        phoneNumber: dto.phone,
      },
    });

    // Assign admin role and set verified flags
    await this.userRepository.update(createdUser.id, {
      adminRoleId: matchedRole.id,
      isEmailVerified: true,
      isPhoneVerified: true,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    });

    this.logger.log(
      `Admin user created: ${createdUser.id} with role ${matchedRole.name}`,
    );

    return new AdminUserListDto({
      id: createdUser.id,
      nickname: createdUser.nickname,
      phone: createdUser.phone,
      email: createdUser.email,
      isActive: createdUser.isActive,
      isBanned: createdUser.isBanned,
      adminRoleId: matchedRole.id,
      adminRoleName: matchedRole.name,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt,
    });
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.userRepository.findByReferralCode(code);
      if (!exists) {
        return code;
      }
    }
    throw new ConflictException('Unable to generate unique referral code');
  }
}
