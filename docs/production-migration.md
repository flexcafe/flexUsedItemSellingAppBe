# Production migration and deployment

Prepared October 12, 2026. Production origin: `8.222.215.56`.
Repository: `flexcafe/flexUsedItemSellingAppBe`. Deploy branch: `main` only.

## Data boundary

The owner chose to retain the existing UAT Supabase project and storage, not the
different project in the local production example. The active UAT `.env` was
transferred directly over authenticated SSH into `/opt/flex/shared/.env`, with
production runtime settings, loopback binding, and proxy trust enabled.
No database reset, seed, storage copy, or destination database replacement is
part of this migration. JWT and integration credentials are retained.

UAT (`47.82.249.130`) is deliberately left running. It now shares the same data
with production; it is not an isolated test environment. Do not run destructive
tests or seeds there. Give UAT its own Supabase project in a separate approved task.
Existing application bootstrap code maintains root-admin role/account integrity
on startup; that behavior has not been changed.

## Server layout (absolute Linux paths)

- `/opt/flex/shared/.env`: root-owned, readable by application group, mode 0640.
- `/opt/flex/releases/`: independent builds per release.
- `/opt/flex/current`: atomic symlink to the running release.
- `/opt/flex/previous`: last healthy release for application rollback.
- `/opt/flex/incoming/`: deployment account upload directory.
- `/opt/flex/backups/`: root-only PostgreSQL dumps and environment backups.
- `/opt/flex/config/`: root-managed deployment configuration templates.
- `/usr/local/sbin/flex-deploy-release`: root-owned release deploy command.
- `/usr/local/sbin/flex-backup-database`: pre-migration backup command.
- `/usr/local/sbin/flex-activate-https`: domain certificate activation command.
- `/etc/nginx/conf.d/flex-api.conf`: domain reverse proxy.
- `/etc/systemd/system/flex-used-market-be.service`: unprivileged application.
- `/opt/node/`: Node 24.19.0, matching the existing UAT runtime.
- `/opt/postgresql/`: PostgreSQL 17 backup client.
- `/opt/certbot/`: dedicated Certbot Python virtual environment.

## GitHub Actions

Every push to `main` triggers production deployment; feature branches do not
deploy. Manual workflow dispatch is supported on `main`. Concurrent deployments
are serialized without interrupting a running deployment; `queue: max` keeps
multiple pending pushes queued rather than replacing the previous pending push.

Repository secrets:

- `PRODUCTION_SSH_KEY`: dedicated deployment key, not the production root key.
- `PRODUCTION_SSH_KNOWN_HOSTS`: pinned origin SSH host key.

The workflow uploads the exact commit archive, rather than requiring repository
credentials on the production server. The deployment SSH account is
`flex-deploy`; the runtime account is `flexapp`. Password SSH is not used by CI.
The existing `SSH_PASSWORD` secret is no longer referenced; it was not deleted
because other workflows or integrations may still need it.

Deploy sequence: upload, lock, isolated dependency installation, build, unit
tests, verified PostgreSQL backup, `prisma migrate deploy`, atomic application
switch, restart, and up to two minutes of `/api/v1/health` checks.
No seeding occurs. Build/test/backup failures leave the previous app running.
Unhealthy starts roll the application back, but do NOT revert database schema.
Use backward-compatible expand/contract migrations; review migration SQL before
pushing to `main`. No zero-downtime guarantee: systemd restart has a short gap.

Infrastructure scripts and service files are root-managed and do not update
automatically from an application push. After reviewing infrastructure changes,
install them separately as root. Do not allow the deployment user to modify
root-owned service definitions or privileged scripts.

## Domain / HTTPS

- Base URL: `https://api.flexusedmarket.com/api/v1`
- Health: `https://api.flexusedmarket.com/api/v1/health`
- Swagger: `https://api.flexusedmarket.com/api/docs`

The origin serves HTTP ACME challenges and redirects other HTTP requests to
HTTPS after certificate issuance. Nginx supports existing Socket.IO connections.
The app listens only on `127.0.0.1:7879`; Redis remains local.

`flex-https-activate.timer` checks every five minutes until issuance is possible.
`flex-certbot-renew.timer` runs twice daily with randomized delay and reloads
Nginx after successful renewal. Certbot was registered without an email because
no operations contact was provided; set one later with `certbot update_account`.

The zone currently uses Cloudflare. Use Full (strict), not Flexible. Do not
cache API responses or challenge authenticated API/WebSocket traffic. Keep
`/.well-known/acme-challenge/` publicly accessible. Cloudflare dashboard changes
and the ECS security-group settings require the relevant administrator.
An A record of `api -> 8.222.215.56` is documented in the workspace's
`DNSrecords.txt`; public DNS may continue showing Cloudflare edge addresses.

Web client CORS origins include the retained UAT allowlist plus the HTTPS apex,
www, and API domains. If an admin UI uses another domain, add its exact origin
to the root-managed environment and restart; do not use wildcard credentials.
When Cloudflare is proxied, the app currently sees the edge IP for rate limits;
trusted Cloudflare real-IP configuration needs separately maintained CIDRs.

## Verification and operations

Run on production as root:

```bash
systemctl status flex-used-market-be nginx redis --no-pager
curl -fsS http://127.0.0.1:7879/api/v1/health
curl -fsS https://api.flexusedmarket.com/api/v1/health
cat /opt/flex/current/REVISION
systemctl list-timers flex-certbot-renew.timer flex-https-activate.timer
/opt/certbot/bin/certbot certificates
/opt/certbot/bin/certbot renew --dry-run --run-deploy-hooks
journalctl -u flex-used-market-be -n 100 --no-pager
```

Public health verifies the API process but is not a comprehensive end-to-end
check. Also verify login, listings/images, email/SMS, and chat with test accounts.

## Application rollback

```bash
test -d /opt/flex/previous
ln -s "$(readlink -f /opt/flex/previous)" /opt/flex/current.rollback
mv -Tf /opt/flex/current.rollback /opt/flex/current
systemctl restart flex-used-market-be
curl -fsS http://127.0.0.1:7879/api/v1/health
```

Coordinate schema recovery separately. Never blindly restore a database dump
over a live database: it can discard writes from both UAT and production.
For DNS rollback, record and restore the old Cloudflare origin configuration;
Cloudflare edge IPs are not origin addresses.

## Follow-up controls

Backups currently remain on the same server. Copy encrypted backups off-server,
monitor disk usage, and define retention; releases/backups are not auto-deleted.
Keep Supabase provider backups enabled and perform a restore drill. A successful
`pg_restore --list` checks the dump structure, not a complete restore test.
Storage objects remain in Supabase and are not included in PostgreSQL dumps.

Some local example environment files contain credentials. Do not commit them;
rotate exposed credentials with coordinated updates on both servers. Rotate the
shared UAT root password supplied in chat. Restrict SSH in the ECS security group
where feasible, preserve 80/443 access for the API and ACME, and enable monitoring.