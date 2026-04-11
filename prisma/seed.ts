import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';

// Parse .env manually to override system env vars
function getEnvFromFile() {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      // Match lines that start with KEY= (ignoring comments and empty lines)
      if (line.trim() && !line.trim().startsWith('#')) {
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const key = line.substring(0, eqIdx).trim();
          let value = line.substring(eqIdx + 1).trim();
          // Remove surrounding quotes
          value = value.replace(/^["'](.*)["']$/, '$1');
          process.env[key] = value;
        }
      }
    });
  } catch (e) {
    console.error('Error: Could not read .env file');
    throw e;
  }
}

getEnvFromFile();

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  // These values should be set in your .env file
  const dbUrl = process.env.DATABASE_URL;
  const email = process.env.ROOT_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ROOT_ADMIN_PASSWORD || 'change-me';
  const phone = process.env.ROOT_ADMIN_PHONE || '+959000000000';
  const nickname = process.env.ROOT_ADMIN_NICKNAME || 'Root Admin';

  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl,
  });
  const prisma = new PrismaClient({ adapter });

  // 1) Ensure ROOT_ADMIN role exists and has full permissions
  const rootRole = await prisma.adminRole.upsert({
    where: { name: 'ROOT_ADMIN' },
    create: {
      name: 'ROOT_ADMIN',
      description: 'System root admin (seeded, immutable)',
      isSystem: true,
      permissions: {
        createMany: {
          data: [
            { permission: 'MANAGE_CATEGORIES' },
            { permission: 'MANAGE_SLIDER_ADS' },
            { permission: 'MANAGE_USERS' },
            { permission: 'MANAGE_LISTINGS' },
            { permission: 'MANAGE_WITHDRAWALS' },
            { permission: 'MANAGE_REPORTS' },
            { permission: 'MANAGE_SUGGESTIONS' },
            { permission: 'MANAGE_TRANSACTIONS' },
            { permission: 'MANAGE_SAFE_PAYMENTS' },
            { permission: 'MANAGE_RANK_CONFIG' },
            { permission: 'MANAGE_POINT_CONFIG' },
            { permission: 'VIEW_ANALYTICS' },
            { permission: 'SEND_NOTIFICATIONS' },
          ],
        },
      },
    },
    update: {
      isSystem: true,
      permissions: {
        deleteMany: {},
        createMany: {
          data: [
            { permission: 'MANAGE_CATEGORIES' },
            { permission: 'MANAGE_SLIDER_ADS' },
            { permission: 'MANAGE_USERS' },
            { permission: 'MANAGE_LISTINGS' },
            { permission: 'MANAGE_WITHDRAWALS' },
            { permission: 'MANAGE_REPORTS' },
            { permission: 'MANAGE_SUGGESTIONS' },
            { permission: 'MANAGE_TRANSACTIONS' },
            { permission: 'MANAGE_SAFE_PAYMENTS' },
            { permission: 'MANAGE_RANK_CONFIG' },
            { permission: 'MANAGE_POINT_CONFIG' },
            { permission: 'VIEW_ANALYTICS' },
            { permission: 'SEND_NOTIFICATIONS' },
          ],
        },
      },
    },
  });

  // 2) Ensure exactly one root admin user exists (by email)
  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      registrationType: 'PHONE_ONLY',
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
      currentRank: 'NEWBIE',
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

  console.log('✓ Root admin user seeded successfully');
  await prisma.$disconnect();
}

main()
  .then(async () => {
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });

