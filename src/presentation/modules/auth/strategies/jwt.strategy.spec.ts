import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';
import type { IUserRepository } from '../../../../domain/repositories/user.repository.interface.js';

function buildConfigService(): jest.Mocked<ConfigService> {
  return {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  } as unknown as jest.Mocked<ConfigService>;
}

function buildUserRepository(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
}

describe(JwtStrategy.name, () => {
  it('accepts active users with matching auth token version', async () => {
    const config = buildConfigService();
    const userRepository = buildUserRepository();
    userRepository.findById.mockResolvedValue({
      isActiveUser: () => true,
      authTokenVersion: 3,
    } as never);

    const strategy = new JwtStrategy(config, userRepository);

    await expect(
      strategy.validate({ sub: 'user-1', phone: '+959123456789', authTokenVersion: 3 }),
    ).resolves.toEqual({ sub: 'user-1', phone: '+959123456789' });
  });

  it('rejects revoked sessions', async () => {
    const config = buildConfigService();
    const userRepository = buildUserRepository();
    userRepository.findById.mockResolvedValue({
      isActiveUser: () => true,
      authTokenVersion: 4,
    } as never);

    const strategy = new JwtStrategy(config, userRepository);

    await expect(
      strategy.validate({ sub: 'user-1', phone: '+959123456789', authTokenVersion: 3 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive users', async () => {
    const config = buildConfigService();
    const userRepository = buildUserRepository();
    userRepository.findById.mockResolvedValue({
      isActiveUser: () => false,
      authTokenVersion: 0,
    } as never);

    const strategy = new JwtStrategy(config, userRepository);

    await expect(
      strategy.validate({ sub: 'user-1', phone: '+959123456789' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
