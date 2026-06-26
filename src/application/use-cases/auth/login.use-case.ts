import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { AdminLoginDto, ClientLoginDto } from '../../dtos/auth/login.dto.js';
import {
  AuthResponseDto,
  AuthTokensDto,
  UserProfileDto,
} from '../../dtos/auth/auth-response.dto.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { normalizeEmail } from '../../../common/utils/normalize-email.js';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async loginClient(dto: ClientLoginDto): Promise<AuthResponseDto> {
    const phone = dto.phone?.trim();
    const email = dto.email?.trim();
    if ((!phone && !email) || (phone && email)) {
      throw new BadRequestException(
        'Provide exactly one identifier: phone or email',
      );
    }

    this.logger.log(
      phone
        ? `Client login attempt: phone=${phone}`
        : `Client login attempt: email=${email}`,
    );

    const user = phone
      ? await this.userRepository.findByPhone(phone)
      : await this.userRepository.findByEmail(normalizeEmail(email!));

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isAdmin()) {
      throw new ForbiddenException(
        'Admin accounts must sign in via the admin dashboard using email',
      );
    }
    return this.finalizeLogin(user, dto.password, false);
  }

  async loginAdmin(dto: AdminLoginDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(dto.email);
    this.logger.log(`Admin login attempt: email=${email}`);
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isAdmin()) {
      throw new ForbiddenException(
        'This sign-in is for admin accounts only. Clients must use client login with phone or email.',
      );
    }
    return this.finalizeLogin(user, dto.password, true);
  }

  private async finalizeLogin(
    user: UserEntity,
    plainPassword: string,
    requireContactVerification: boolean,
  ): Promise<AuthResponseDto> {
    if (!user.isActiveUser()) {
      throw new UnauthorizedException('Account is deactivated or banned');
    }

    const passwordValid = await compare(plainPassword, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (
      requireContactVerification &&
      (!user.isPhoneVerified || !user.isEmailVerified)
    ) {
      throw new ForbiddenException(
        'Phone and email verification are required before login',
      );
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      authTokenVersion: user.authTokenVersion,
    });

    const authData = await this.userRepository.getAuthDataByUserId(user.id);
    if (!authData) {
      throw new UnauthorizedException('User profile not found');
    }

    return new AuthResponseDto(
      new UserProfileDto(authData),
      new AuthTokensDto(accessToken),
    );
  }
}
