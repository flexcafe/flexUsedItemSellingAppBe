#!/usr/bin/env node
/**
 * Run a k6 script with env vars from perf/k6/.env.fixtures (avoids Windows shell quoting issues).
 * Usage: node perf/k6/run-with-fixtures.mjs perf/k6/product-section.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = process.argv[2];
if (!script) {
  console.error('Usage: node perf/k6/run-with-fixtures.mjs <k6-script.js>');
  process.exit(1);
}

const fixturesPath = resolve(__dirname, '.env.fixtures');
if (!existsSync(fixturesPath)) {
  console.error(`Missing ${fixturesPath}. Run: node perf/collect-fixtures.mjs > perf/k6/.env.fixtures`);
  process.exit(1);
}

const fixtureEnv = Object.fromEntries(
  readFileSync(fixturesPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    }),
);

const k6Bin =
  process.platform === 'win32'
    ? 'C:\\Program Files\\k6\\k6.exe'
    : 'k6';

const extraArgs = process.argv.slice(3);
const result = spawnSync(
  k6Bin,
  ['run', resolve(process.cwd(), script), ...extraArgs],
  {
    env: {
      ...process.env,
      K6_PROFILE: process.env.K6_PROFILE || 'local',
      ...fixtureEnv,
    },
    stdio: 'inherit',
    cwd: process.cwd(),
  },
);

process.exit(result.status ?? 1);
