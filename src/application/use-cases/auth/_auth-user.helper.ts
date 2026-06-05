import { UnauthorizedException } from '@nestjs/common';
import type { UserEntity } from '../../../domain/entities/user.entity.js';

export function requireActiveAuthUser(user: UserEntity, notFoundMessage?: string) {
  if (!user.isActiveUser()) {
    throw new UnauthorizedException(
      notFoundMessage ?? 'Account is deactivated or banned',
    );
  }
}
