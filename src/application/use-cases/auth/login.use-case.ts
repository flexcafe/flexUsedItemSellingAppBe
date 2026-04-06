import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { LoginDto } from '../../dtos/auth/login.dto.js';
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

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    this.validateLoginMode(dto);

    const user = await this.resolveUser(dto);

    if (!user.isActiveUser()) {
      throw new UnauthorizedException('Account is deactivated or banned');
    }

    const passwordValid = await compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
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

  private validateLoginMode(dto: LoginDto): void {
    const hasPhone = Boolean(dto.phone);
    const hasFacebook = Boolean(dto.facebookId);

    if (hasPhone === hasFacebook) {
      throw new BadRequestException(
        'Provide exactly one login method: phone or facebookId',
      );
    }
  }

  private async resolveUser(dto: LoginDto): Promise<UserEntity> {
    let user: UserEntity | null = null;

    if (dto.phone) {
      this.logger.log(`Login attempt via phone: ${dto.phone}`);
      user = await this.userRepository.findByPhone(dto.phone);
    } else if (dto.facebookId) {
      this.logger.log('Login attempt via Facebook ID');
      user = await this.userRepository.findByFacebookId(dto.facebookId);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
