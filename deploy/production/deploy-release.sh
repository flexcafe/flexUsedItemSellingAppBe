#!/usr/bin/env bash
# Installed root-owned as /usr/local/sbin/flex-deploy-release.
set -euo pipefail
export PATH=/opt/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
[[ $# == 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || { echo 'Usage: flex-deploy-release COMMIT_SHA'; exit 2; }
sha=$1
exec 9>/opt/flex/deploy.lock
flock -w 1800 9
archive="/opt/flex/incoming/${sha}.tar.gz"
[[ -f "$archive" && ! -L "$archive" ]] || { echo 'Missing release archive'; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
release="/opt/flex/releases/${stamp}-${sha}"
previous=$(readlink -f /opt/flex/current || true)
test -r /opt/flex/shared/.env
install -d -o flex-deploy -g flex-deploy -m 750 "$release"
runuser -u flex-deploy -- tar --no-same-owner --no-same-permissions -xzf "$archive" -C "$release"
chown -R flexapp:flexapp "$release"
ln -s /opt/flex/shared/.env "$release/.env"
cp /opt/flex/shared/.env "/opt/flex/backups/${stamp}-${sha}.env"
chmod 600 "/opt/flex/backups/${stamp}-${sha}.env"
cd "$release"
runuser -u flexapp -- env NODE_OPTIONS=--max-old-space-size=2048 npm ci --no-audit --no-fund
runuser -u flexapp -- env NODE_OPTIONS=--max-old-space-size=2048 npm run build
test -f dist/src/main.js
runuser -u flexapp -- npm test -- --runInBand
# Every schema deployment requires a successful database backup. Never seed/reset.
/usr/local/sbin/flex-backup-database "$stamp-$sha"
runuser -u flexapp -- npm run db:migrate:deploy
printf '%s\n' "$sha" > REVISION
rollback() {
  echo 'Release health check failed; rolling application back (schema is NOT automatically reverted).'
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -s "$previous" /opt/flex/current.rollback
    mv -Tf /opt/flex/current.rollback /opt/flex/current
    systemctl restart flex-used-market-be
  else
    systemctl stop flex-used-market-be
  fi
  exit 1
}
trap rollback ERR
ln -s "$release" /opt/flex/current.next
mv -Tf /opt/flex/current.next /opt/flex/current
systemctl restart flex-used-market-be
healthy=0
for attempt in $(seq 1 60); do
  if curl -fsS --max-time 3 http://127.0.0.1:7879/api/v1/health | grep -q '"status":"ok"'; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "$healthy" == 1 ]] || rollback
systemctl is-active --quiet flex-used-market-be
trap - ERR
if [[ -n "$previous" && -d "$previous" && "$previous" != "$release" ]]; then
  ln -sfn "$previous" /opt/flex/previous
fi
rm -f "$archive"
echo "Healthy production release: $sha"