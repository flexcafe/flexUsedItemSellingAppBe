import {
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

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async loginClient(dto: ClientLoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Client login attempt: phone=${dto.phone}`);
    const user = await this.userRepository.findByPhone(dto.phone);
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
    this.logger.log(`Admin login attempt: email=${dto.email}`);
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isAdmin()) {
      throw new ForbiddenException(
        'This sign-in is for admin accounts only. Clients must use phone login.',
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
