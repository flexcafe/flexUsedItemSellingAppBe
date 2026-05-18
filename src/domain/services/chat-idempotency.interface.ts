export interface IChatIdempotencyStore {
  reserve(key: string, ttlSeconds: number): Promise<boolean>;
  allowRateLimitedAction(
    key: string,
    maxActions: number,
    windowSeconds: number,
  ): Promise<boolean>;
}

export const CHAT_IDEMPOTENCY_STORE = Symbol('CHAT_IDEMPOTENCY_STORE');
