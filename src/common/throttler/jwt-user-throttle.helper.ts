import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../decorators/current-user.decorator.js';

/**
 * Per-authenticated-user rate limit key (JWT `sub` after Passport validates).
 * Use only on routes guarded with JwtAuthGuard before ThrottlerGuard.
 */
export function jwtUserSubTracker(
  req: Request,
  context: ExecutionContext,
): string {
  void context;
  const user = (req as Request & { user?: JwtPayload }).user;
  if (user?.sub) {
    return `jwt:${user.sub}`;
  }
  return 'jwt:anon';
}
