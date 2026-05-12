import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

export async function assertAdmin(
  userRepository: IUserRepository,
  userId: string,
): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundException('Admin user not found');
  }
  if (!user.isAdmin()) {
    throw new ForbiddenException('Only admin users can perform this action');
  }
}

export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
