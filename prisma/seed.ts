import dotenv from 'dotenv';
import {
  PrismaClient,
  AdminPermission,
  RegistrationType,
  RankTier,
} from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';

// Load env the same way the Nest app does.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  // Root admin identity (only one should exist)
  const email = requireEnv('ROOT_ADMIN_EMAIL');
  const password = requireEnv('ROOT_ADMIN_PASSWORD');
  const phone = process.env.ROOT_ADMIN_PHONE ?? '+959000000000';
  const nickname = process.env.ROOT_ADMIN_NICKNAME ?? 'Root Admin';

  // 1) Ensure ROOT_ADMIN role exists and has full permissions
  const rootRole = await prisma.adminRole.upsert({
    where: { name: 'ROOT_ADMIN' },
    create: {
      name: 'ROOT_ADMIN',
      description: 'System root admin (seeded, immutable)',
      isSystem: true,
      permissions: {
        create: Object.values(AdminPermission).map((permission) => ({
          permission,
        })),
      },
    },
    update: {
      isSystem: true,
      // Ensure all permissions exist (idempotent)
      permissions: {
        deleteMany: {},
        create: Object.values(AdminPermission).map((permission) => ({
          permission,
        })),
      },
    },
  });

  // 2) Ensure exactly one root admin user exists (by email)
  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      registrationType: RegistrationType.PHONE_ONLY,
      phone,
      email,
      password: passwordHash,
      nickname,
      facebookId: null,
      isEmailVerified: true,
      isPhoneVerified: true,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      isActive: true,
      isBanned: false,
      totalPoints: 0,
      currentRank: RankTier.NEWBIE,
      referralCode: generateReferralCode(),
      referredById: null,
      adminRoleId: rootRole.id,
    },
    update: {
      phone,
      password: passwordHash,
      nickname,
      isEmailVerified: true,
      isPhoneVerified: true,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      isActive: true,
      isBanned: false,
      adminRoleId: rootRole.id,
    },
  });

  // Optional safety: prevent multiple admins by email mismatch is handled by policy,
  // but you can add a manual check here if needed.
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

