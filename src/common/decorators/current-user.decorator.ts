import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  phone: string;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload | null }>();
    const user = request.user ?? null;
    if (!user) {
      return null;
    }
    return data ? user[data] : user;
  },
);
