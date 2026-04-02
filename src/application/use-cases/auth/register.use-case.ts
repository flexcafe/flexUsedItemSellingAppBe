import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { RegisterDto } from '../../dtos/auth/register.dto.js';
import {
  AuthResponseDto,
  AuthTokensDto,
  UserProfileDto,
} from '../../dtos/auth/auth-response.dto.js';

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registering user: ${dto.phone}`);

    const existingPhone = await this.userRepository.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    if (dto.email) {
      const existingEmail = await this.userRepository.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (dto.facebookId) {
      const existingFb = await this.userRepository.findByFacebookId(
        dto.facebookId,
      );
      if (existingFb) {
        throw new ConflictException(
          'A user with this Facebook ID already exists',
        );
      }
    }

    const hashedPassword = await hash(dto.password, 12);
    const referralCode = randomBytes(4).toString('hex').toUpperCase();

    const user = await this.userRepository.create({
      registrationType: dto.registrationType,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      nickname: dto.nickname,
      facebookId: dto.facebookId,
      referralCode,
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
    });

    return new AuthResponseDto(
      new UserProfileDto(user),
      new AuthTokensDto(accessToken),
    );
  }
}
