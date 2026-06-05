import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../../../../common/decorators/current-user.decorator.js';
import { USER_REPOSITORY } from '../../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../../domain/repositories/user.repository.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    phone: string;
    authTokenVersion?: number;
  }): Promise<JwtPayload> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActiveUser()) {
      throw new UnauthorizedException('Account is deactivated or banned');
    }
    const tokenVersion = payload.authTokenVersion ?? 0;
    if (user.authTokenVersion !== tokenVersion) {
      throw new UnauthorizedException('Session has been revoked');
    }
    return { sub: payload.sub, phone: payload.phone };
  }
}
