import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ALLOW_VPN_KEY } from '../decorators/allow-vpn.decorator.js';

@Injectable()
export class VpnRestrictionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const hasVpnHeader = this.parseVpnHeader(request);
    if (!hasVpnHeader) {
      return true;
    }

    const isAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_VPN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isAllowed) {
      return true;
    }

    throw new ForbiddenException(
      'VPN usage is allowed only on Facebook link/follow verification endpoints.',
    );
  }

  private parseVpnHeader(req: Request): boolean {
    const value = req.headers['x-client-vpn'];
    if (Array.isArray(value)) {
      return value.some((v) => this.truthy(v));
    }
    return this.truthy(value);
  }

  private truthy(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
}
