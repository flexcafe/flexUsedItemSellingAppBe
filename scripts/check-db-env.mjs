import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const ENV_FILES = [
  { label: 'development', file: '.env.development' },
  { label: 'production', file: '.env.production' },
  { label: 'production-backup', file: '.env.production-backup' },
];

function maskUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '(invalid URL)';
  }
}

async function checkOne({ label, file }) {
  const envPath = resolve(process.cwd(), file);
  if (!existsSync(envPath)) {
    console.log(`[${label}] SKIP — missing ${file}`);
    return;
  }

  config({ path: envPath, override: true });
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.log(`[${label}] FAIL — set DIRECT_URL or DATABASE_URL in ${file}`);
    return;
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const version = await client.query('SELECT version()');
    const dbName = await client.query('SELECT current_database()');
    console.log(
      `[${label}] OK — db=${dbName.rows[0].current_database} url=${maskUrl(url)}`,
    );
    console.log(`         ${version.rows[0].version.split(',')[0]}`);
  } catch (err) {
    console.log(`[${label}] FAIL — ${String(err)}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

for (const env of ENV_FILES) {
  await checkOne(env);
}
