import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Client IP for rate limiting. Prefer first X-Forwarded-For hop when present
 * (set `TRUST_PROXY=1` in production so Express trusts proxy headers).
 */
export function authIpTracker(req: Request, context: ExecutionContext): string {
  void context;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  const ip = req.ip ?? req.socket?.remoteAddress;
  return typeof ip === 'string' && ip.length > 0 ? ip : 'unknown';
}

/**
 * Secondary bucket: phone, email, or registration pair from JSON body.
 * Matches client login / admin login / OTP / email resend / register shapes.
 */
export function authBodyIdentifierTracker(
  req: Request,
  context: ExecutionContext,
): string {
  void context;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const phoneRaw = body['phone'];
  const emailRaw = body['email'];
  const phone =
    typeof phoneRaw === 'string' && phoneRaw.trim().length > 0
      ? phoneRaw.trim()
      : '';
  const email =
    typeof emailRaw === 'string' && emailRaw.trim().length > 0
      ? emailRaw.trim().toLowerCase()
      : '';

  if (phone && email) {
    return `reg:${phone}|${email}`;
  }
  if (phone) {
    return `phone:${phone}`;
  }
  if (email) {
    return `email:${email}`;
  }
  return 'anon';
}
