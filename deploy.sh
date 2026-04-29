#!/usr/bin/env bash
set -euo pipefail

# One-command deploy for this project.
# Assumes:
# - repo is already cloned on the VPS
# - PM2 process name is correct

APP_DIR="/var/www/flex-used-item-market-be/flexUsedItemSellingAppBe"
PM2_NAME="flexUsedItemSellingAppBe"

cd "$APP_DIR"

echo "==> Updating code"
git pull

echo "==> Ensure .env exists (Prisma reads .env by default)"
if [ -f ".env.local" ] && [ ! -f ".env" ]; then
  mv .env.local .env
fi

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found. Create it before deploying."
  exit 1
fi

echo "==> Install deps"
npm ci

echo "==> Build"
npm run build

echo "==> Run migrations (deploy-safe)"
npm run db:migrate:deploy

echo "==> Seed database (optional)"
if [ "${SEED_ON_DEPLOY:-0}" = "1" ]; then
  npm run db:seed
else
  echo "Skipping seed (set SEED_ON_DEPLOY=1 to enable)"
fi

echo "==> Restart PM2 (reload env too)"
pm2 restart "$PM2_NAME" --update-env

echo "==> Status"
pm2 status "$PM2_NAME"

