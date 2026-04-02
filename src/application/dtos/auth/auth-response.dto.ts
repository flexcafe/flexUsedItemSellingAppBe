import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../../domain/entities/user.entity.js';

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
}

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty({ required: false, nullable: true })
  email: string | null;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  currentRank: string;

  @ApiProperty()
  totalPoints: number;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.nickname = user.nickname;
    this.email = user.email;
    this.phone = user.phone;
    this.currentRank = user.currentRank;
    this.totalPoints = user.totalPoints;
  }
}

export class AuthResponseDto {
  @ApiProperty()
  user: UserProfileDto;

  @ApiProperty()
  tokens: AuthTokensDto;

  constructor(user: UserProfileDto, tokens: AuthTokensDto) {
    this.user = user;
    this.tokens = tokens;
  }
}
