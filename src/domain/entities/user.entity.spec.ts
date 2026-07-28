import { UserEntity } from './user.entity.js';
import { RegistrationType } from '../enums/registration-type.enum.js';
import { RankTier } from '../enums/rank-tier.enum.js';

function buildUser(
  overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {},
) {
  return new UserEntity({
    id: 'user-1',
    registrationType: RegistrationType.PHONE_ONLY,
    phone: '+959123456789',
    email: 'john@example.com',
    password: 'hashed',
    nickname: 'Nick',
    facebookId: null,
    isEmailVerified: true,
    isPhoneVerified: true,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    isActive: true,
    isBanned: false,
    deletedAt: null,
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: 'REFCODE1',
    referredById: null,
    adminRoleId: null,
    authTokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe(UserEntity.name, () => {
  it('isActiveUser is true for active non-banned non-deleted users', () => {
    expect(buildUser().isActiveUser()).toBe(true);
    expect(buildUser().isDeleted()).toBe(false);
  });

  it('isActiveUser is false when banned', () => {
    expect(buildUser({ isBanned: true }).isActiveUser()).toBe(false);
  });

  it('isActiveUser is false when inactive', () => {
    expect(buildUser({ isActive: false }).isActiveUser()).toBe(false);
  });

  it('isActiveUser is false and isDeleted is true when deletedAt is set', () => {
    const user = buildUser({
      deletedAt: new Date('2026-07-29T12:00:00.000Z'),
      isActive: false,
    });
    expect(user.isDeleted()).toBe(true);
    expect(user.isActiveUser()).toBe(false);
  });

  it('isAdmin is true when adminRoleId is set', () => {
    expect(buildUser({ adminRoleId: 'role-1' }).isAdmin()).toBe(true);
  });
});
