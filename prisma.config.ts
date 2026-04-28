import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const datasourceUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error(
    'Prisma config error: set DIRECT_URL (preferred for migrations) or DATABASE_URL in .env',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Prefer DIRECT_URL when available (non-pgbouncer direct connection).
    url: datasourceUrl,
  },
});

