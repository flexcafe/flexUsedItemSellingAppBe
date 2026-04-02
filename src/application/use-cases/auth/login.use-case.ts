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
    const user = await this.resolveUser(dto);

    if (!user.isActiveUser()) {
      throw new UnauthorizedException('Account is deactivated or banned');
    }

    const passwordValid = await compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
    });

    return new AuthResponseDto(
      new UserProfileDto(user),
      new AuthTokensDto(accessToken),
    );
  }

  private async resolveUser(dto: LoginDto): Promise<UserEntity> {
    let user: UserEntity | null = null;

    if (dto.phone) {
      this.logger.log(`Login attempt via phone: ${dto.phone}`);
      user = await this.userRepository.findByPhone(dto.phone);
    } else if (dto.facebookId) {
      this.logger.log(`Login attempt via Facebook ID`);
      user = await this.userRepository.findByFacebookId(dto.facebookId);
    } else if (dto.email) {
      this.logger.log(`Login attempt via email: ${dto.email}`);
      user = await this.userRepository.findByEmail(dto.email);
    } else {
      throw new BadRequestException(
        'Provide phone, facebookId, or email to login',
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
