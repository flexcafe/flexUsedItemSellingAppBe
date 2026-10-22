import 'dotenv/config';
import PrismaPkg from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hash } from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_USERS } from './seed-data.js';
import { PRODUCT_IMAGE_SOURCES } from './seed-images.js';

const { PrismaClient } = PrismaPkg;

function getEnvFromFile() {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    for (const line of envContent.split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = line.substring(0, eqIdx).trim();
      const value = line
        .substring(eqIdx + 1)
        .trim()
        .replace(/^["'](.*)["']$/, '$1');
      process.env[key] = value;
    }
  } catch {
    console.error('Error: Could not read .env file');
    throw new Error('Missing .env file');
  }
}

getEnvFromFile();

const ROOT_ADMIN_PERMISSIONS = [
  'MANAGE_CATEGORIES',
  'MANAGE_SLIDER_ADS',
  'MANAGE_USERS',
  'MANAGE_LISTINGS',
  'MANAGE_WITHDRAWALS',
  'MANAGE_REPORTS',
  'MANAGE_SUGGESTIONS',
  'MANAGE_TRANSACTIONS',
  'MANAGE_SAFE_PAYMENTS',
  'MANAGE_RANK_CONFIG',
  'MANAGE_POINT_CONFIG',
  'VIEW_ANALYTICS',
  'SEND_NOTIFICATIONS',
] as const;

/**
 * Tables that must survive the seed wipe.
 *
 * - users: the root admin is preserved; all other users are deleted explicitly.
 * - categories: seeded/upserted rather than truncated so existing IDs stay stable.
 * - slider_ads: the 3 launched ads must not be deleted.
 * - admin roles, filter keywords, rank/point config and terms are app config.
 */
const PRESERVE_TABLES = new Set([
  '_prisma_migrations',
  'spatial_ref_sys',
  'users',
  'admin_roles',
  'admin_role_permissions',
  'categories',
  'content_filter_keywords',
  'rank_configs',
  'star_point_configs',
  'terms_of_service',
  'slider_ads',
]);

const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'FlexSeed@123';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PRODUCT_IMAGE_BUCKET =
  process.env.SUPABASE_PRODUCT_IMAGE_BUCKET || 'listing-images';

function extensionFromContentType(
  contentType: string,
  sourceUrl: string,
): string {
  const type = contentType.toLowerCase().split(';')[0].trim();
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/jpeg' || type === 'image/jpg') return '.jpg';

  const path = new URL(sourceUrl).pathname.toLowerCase();
  if (path.endsWith('.png')) return '.png';
  if (path.endsWith('.webp')) return '.webp';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return '.jpg';

  throw new Error(
    `Unsupported image content type "${contentType}" for ${sourceUrl}`,
  );
}

async function uploadSeedProductImage(
  supabase: SupabaseClient,
  sourceUrl: string,
  sellerId: string,
): Promise<{ publicUrl: string; objectPath: string }> {
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent':
        'FlexUsedMarketSeed/1.0 (https://flexusedmarket.com; dev@flexusedmarket.com)',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(
      `Could not download seed image ${sourceUrl}: HTTP ${response.status}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const ext = extensionFromContentType(contentType, sourceUrl);
  const normalizedContentType =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : 'image/jpeg';
  const body = Buffer.from(await response.arrayBuffer());
  const objectPath = `listings/${sellerId}/images/seed-${randomUUID()}${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(objectPath, body, {
      contentType: normalizedContentType,
      upsert: true,
    });
  if (error) {
    throw new Error(
      `Supabase upload failed for ${objectPath}: ${error.message}`,
    );
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error(`Could not build public URL for ${objectPath}`);
  }

  return { publicUrl: data.publicUrl, objectPath };
}

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function clearBusinessData(
  tx: Prisma.TransactionClient,
  rootUserId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;
  const names = rows
    .map((row) => row.tablename)
    .filter((name) => /^[a-z0-9_]+$/.test(name) && !PRESERVE_TABLES.has(name));

  if (names.length > 0) {
    const quoted = names.map((name) => `"${name}"`).join(', ');
    await tx.$executeRawUnsafe(
      `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
    );
    console.log(
      `[seed] cleared ${names.length} business tables (users, categories and slider ads preserved)`,
    );
  }

  await tx.$executeRaw`UPDATE "users" SET "referred_by_id" = NULL`;
  await tx.$executeRaw`DELETE FROM "users" WHERE "id" <> ${rootUserId}`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const email = (process.env.ROOT_ADMIN_EMAIL || 'admin@example.com')
    .trim()
    .toLowerCase();
  const password = process.env.ROOT_ADMIN_PASSWORD || 'change-me';
  const phone = (process.env.ROOT_ADMIN_PHONE || '+959000000000').trim();
  const nickname = process.env.ROOT_ADMIN_NICKNAME || 'Root Admin';

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: dbUrl }),
  });
  const now = new Date();

  try {
    const [rootPasswordHash, seedPasswordHash] = await Promise.all([
      hash(password, 12),
      hash(SEED_USER_PASSWORD, 12),
    ]);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY are required to upload seed product images',
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Generate IDs up front so uploaded objects can use the real seller path
    // before the database transaction starts.
    const userRows = SEED_USERS.map((user, index) => ({
      id: randomUUID(),
      registrationType: 'PHONE_ONLY' as const,
      phone: user.phone,
      email: user.email,
      password: seedPasswordHash,
      nickname: user.nickname,
      facebookId: null,
      isEmailVerified: true,
      isPhoneVerified: true,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      isActive: true,
      isBanned: false,
      termsAcceptedAt: now,
      termsVersion: '2026-01',
      totalPoints: 0,
      currentRank: 'NEWBIE' as const,
      referralCode: `SEED${String(index + 1).padStart(4, '0')}`,
      referredById: null,
      adminRoleId: null,
    }));

    const userIds = new Map(
      SEED_USERS.map((user, index) => [user.key, userRows[index].id]),
    );

    const seedImageUrls = new Map<number, string>();
    const uploadedObjectPaths: string[] = [];

    try {
      let imageCursor = 0;
      const imageConcurrency = 5;
      await Promise.all(
        Array.from({ length: imageConcurrency }, async () => {
          while (imageCursor < SEED_PRODUCTS.length) {
            const index = imageCursor++;
            const product = SEED_PRODUCTS[index];
            const sellerId = userIds.get(product.seller);
            if (!sellerId) {
              throw new Error(
                `Unknown seller key for image upload: ${product.seller}`,
              );
            }
            const uploaded = await uploadSeedProductImage(
              supabase,
              PRODUCT_IMAGE_SOURCES[product.image],
              sellerId,
            );
            seedImageUrls.set(index, uploaded.publicUrl);
            uploadedObjectPaths.push(uploaded.objectPath);
            console.log(
              `[seed] uploaded image ${index + 1}/${SEED_PRODUCTS.length}: ${product.image}`,
            );
          }
        }),
      );
    } catch (error) {
      if (uploadedObjectPaths.length > 0) {
        await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .remove(uploadedObjectPaths);
        console.log(
          `[seed] removed ${uploadedObjectPaths.length} uploaded images after upload failure`,
        );
      }
      throw error;
    }

    const summary = await prisma
      .$transaction(
        async (tx) => {
          const rootRole = await tx.adminRole.upsert({
            where: { name: 'ROOT_ADMIN' },
            create: {
              name: 'ROOT_ADMIN',
              description: 'System root admin (seeded, immutable)',
              isSystem: true,
              permissions: {
                createMany: {
                  data: ROOT_ADMIN_PERMISSIONS.map((permission) => ({
                    permission,
                  })),
                },
              },
            },
            update: {
              isSystem: true,
              permissions: {
                deleteMany: {},
                createMany: {
                  data: ROOT_ADMIN_PERMISSIONS.map((permission) => ({
                    permission,
                  })),
                },
              },
            },
          });

          const rootUser = await tx.user.upsert({
            where: { email },
            create: {
              registrationType: 'EMAIL_ONLY',
              phone,
              email,
              password: rootPasswordHash,
              nickname,
              facebookId: null,
              isEmailVerified: true,
              isPhoneVerified: true,
              emailVerifiedAt: now,
              phoneVerifiedAt: now,
              isActive: true,
              isBanned: false,
              termsAcceptedAt: now,
              termsVersion: '2026-01',
              totalPoints: 0,
              currentRank: 'NEWBIE',
              referralCode: generateReferralCode(),
              referredById: null,
              adminRoleId: rootRole.id,
            },
            update: {
              registrationType: 'EMAIL_ONLY',
              phone,
              password: rootPasswordHash,
              nickname,
              isEmailVerified: true,
              isPhoneVerified: true,
              emailVerifiedAt: now,
              phoneVerifiedAt: now,
              isActive: true,
              isBanned: false,
              adminRoleId: rootRole.id,
            },
            select: { id: true, email: true },
          });

          await clearBusinessData(tx, rootUser.id);

          const sliderAds = await tx.sliderAd.updateMany({
            data: { createdById: rootUser.id },
          });

          const categoryIds = new Map<string, string>();
          for (const category of SEED_CATEGORIES) {
            const row = await tx.category.upsert({
              where: { slug: category.slug },
              create: {
                name: category.name,
                slug: category.slug,
                sortOrder: category.sortOrder,
                isActive: true,
              },
              update: {
                name: category.name,
                sortOrder: category.sortOrder,
                isActive: true,
              },
              select: { id: true },
            });
            categoryIds.set(category.key, row.id);
          }

          await tx.category.updateMany({
            where: { slug: { in: ['product', 'child'] } },
            data: { isActive: false },
          });

          await tx.user.createMany({ data: userRows });

          await tx.userProfile.createMany({
            data: SEED_USERS.map((user, index) => ({
              userId: userRows[index].id,
              gender: user.gender,
              age: user.age,
              maritalStatus: user.maritalStatus,
              inputRegion: user.region,
              gpsLatitude: user.latitude,
              gpsLongitude: user.longitude,
              isRegionVerified: true,
              gpsVerifiedAt: now,
              bio: user.bio,
            })),
          });

          await tx.kbzPayAccount.createMany({
            data: SEED_USERS.map((user, index) => ({
              userId: userRows[index].id,
              accountName: user.nickname,
              phoneNumber: user.phone,
              status: 'VERIFIED' as const,
              isVerified: true,
              verifiedAt: now,
            })),
          });

          const listingRows = SEED_PRODUCTS.map((product, index) => {
            const sellerId = userIds.get(product.seller);
            const categoryId = categoryIds.get(product.category);
            if (!sellerId) {
              throw new Error(`Unknown seller key: ${product.seller}`);
            }
            if (!categoryId) {
              throw new Error(`Unknown category key: ${product.category}`);
            }
            return {
              id: randomUUID(),
              sellerId,
              categoryId,
              title: product.title,
              description: product.description,
              price: product.price,
              condition: product.condition,
              status: 'ACTIVE' as const,
              paymentMethods: product.payments,
              directTradeLocation: product.location,
              directTradeLatitude: product.latitude,
              directTradeLongitude: product.longitude,
              mapScreenshotUrl: null,
              nearbyLandmarks: product.landmarks,
              preferredTradeTime: product.preferredTime,
              isDeliveryAvailable: product.delivery,
              deliveryFeePayer: product.deliveryPayer,
              viewCount: 10 + index * 3,
              createdAt: new Date(now.getTime() - index * 6 * 60 * 60 * 1000),
            };
          });

          await tx.listing.createMany({ data: listingRows });

          await tx.listingImage.createMany({
            data: SEED_PRODUCTS.map((product, index) => {
              const url = seedImageUrls.get(index);
              if (!url) {
                throw new Error(
                  `Missing uploaded image for product: ${product.title}`,
                );
              }
              return {
                id: randomUUID(),
                listingId: listingRows[index].id,
                url,
                sortOrder: 0,
              };
            }),
          });

          await tx.preferredTradeLocation.createMany({
            data: SEED_PRODUCTS.flatMap((product, index) => [
              {
                id: randomUUID(),
                listingId: listingRows[index].id,
                label: 'Location 1',
                address: product.location,
                latitude: product.latitude,
                longitude: product.longitude,
                sortOrder: 0,
              },
              {
                id: randomUUID(),
                listingId: listingRows[index].id,
                label: 'Location 2',
                address: `${product.landmarks} area`,
                latitude: product.latitude + 0.004,
                longitude: product.longitude + 0.004,
                sortOrder: 1,
              },
            ]),
          });

          return {
            productsCreated: listingRows.length,
            usersCreated: SEED_USERS.length,
            categoriesUpserted: SEED_CATEGORIES.length,
            sliderAdsUpdated: sliderAds.count,
          };
        },
        { maxWait: 10000, timeout: 120000 },
      )
      .catch(async (error) => {
        if (uploadedObjectPaths.length > 0) {
          await supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .remove(uploadedObjectPaths);
          console.log(
            `[seed] removed ${uploadedObjectPaths.length} uploaded images after database failure`,
          );
        }
        throw error;
      });

    // Remove product images uploaded by earlier seed runs. Only objects with the
    // `seed-` marker are touched, so normal user-uploaded listing images are safe.
    try {
      const staleRows = await prisma.$queryRaw<{ name: string }[]>`
        SELECT name
        FROM storage.objects
        WHERE bucket_id = ${PRODUCT_IMAGE_BUCKET}
          AND name LIKE 'listings/%/images/seed-%'
      `;
      const currentPaths = new Set(uploadedObjectPaths);
      const stalePaths = staleRows
        .map((row) => row.name)
        .filter((name) => !currentPaths.has(name));
      if (stalePaths.length > 0) {
        const { error } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .remove(stalePaths);
        if (error) {
          console.warn(
            `[seed] could not remove ${stalePaths.length} old seed images: ${error.message}`,
          );
        } else {
          console.log(`[seed] removed ${stalePaths.length} old seed images`);
        }
      }
    } catch (error) {
      console.warn(
        `[seed] old seed image cleanup skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const [userCount, listingCount, sliderAdCount, profileCount, kbzCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.listing.count(),
        prisma.sliderAd.count(),
        prisma.userProfile.count(),
        prisma.kbzPayAccount.count(),
      ]);

    console.log('[seed] complete');
    console.log(`  root admin: ${email}`);
    console.log(
      `  users: ${userCount} (root + ${summary.usersCreated} seeded)`,
    );
    console.log(
      `  products: ${listingCount} (${summary.productsCreated} created)`,
    );
    console.log(
      `  product images uploaded: ${seedImageUrls.size} to bucket "${PRODUCT_IMAGE_BUCKET}"`,
    );
    console.log(`  categories upserted: ${summary.categoriesUpserted}`);
    console.log(
      `  slider ads preserved: ${sliderAdCount} (attribution updated: ${summary.sliderAdsUpdated})`,
    );
    console.log(`  profiles: ${profileCount}, KBZPay accounts: ${kbzCount}`);
    console.log(`  seeded user password: ${SEED_USER_PASSWORD}`);
    for (const user of SEED_USERS) {
      console.log(`    ${user.phone} | ${user.email} | ${user.nickname}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
