import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Attempts JWT auth but allows anonymous access when no/invalid token is present.
 * Use on public catalog routes so logged-in users get block filtering.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
    }>();
    const auth = request.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
