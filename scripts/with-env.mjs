import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = process.argv[2];
const cmd = process.argv.slice(3);

if (!envFile || cmd.length === 0) {
  console.error(
    'Usage: node scripts/with-env.mjs <env-file> <command...>\n' +
      'Example: node scripts/with-env.mjs .env.development npm run db:migrate:deploy',
  );
  process.exit(1);
}

const envPath = resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  console.error(`Env file not found: ${envPath}`);
  console.error(`Copy ${envFile}.example to ${envFile} and fill in Supabase credentials.`);
  process.exit(1);
}

config({ path: envPath, override: true });

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
