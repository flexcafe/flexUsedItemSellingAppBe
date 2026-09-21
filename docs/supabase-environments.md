# Supabase: development, production, and production backup

This backend uses **one PostgreSQL database per Supabase project**. A Pro plan applies **per project**, not as “3 databases inside one project.”

Use **three separate Supabase projects** in the same organization:

| Project | Purpose | Wired to API? |
|---------|---------|---------------|
| `flex-dev` (example name) | Local dev, migrations, seed, experiments | Your machine only |
| `flex-prod` | Live users | Production VPS / hosting |
| `flex-prod-backup` | Disaster recovery clone (schema + periodic data refresh) | **No** (failover only) |

Built-in **daily backups** and optional **PITR** on `flex-prod` are still recommended. The backup **project** is an extra safety net you control (restore drills, failover target).

---

## Step 1 — Create three Supabase projects

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your organization.
2. **New project** → create:
   - `flex-dev` — region close to developers; **Free** tier is OK if you only need Postgres + Storage for dev.
   - `flex-prod` — **Pro** plan, same region as your VPS users.
   - `flex-prod-backup` — same region as prod; can stay on Free until you need larger restore capacity.
3. Save each project’s **database password** in your password manager.

---

## Step 2 — Connection strings (each project)

For **each** project: **Project Settings → Database → Connection string**

| Variable | Supabase UI | Used for |
|----------|-------------|----------|
| `DATABASE_URL` | URI, **Connection pooling**, port **6543**, `?pgbouncer=true` | NestJS / Prisma at runtime |
| `DIRECT_URL` | URI, **Direct connection**, port **5432** | `prisma migrate deploy` |

Also copy from **Project Settings → API**:

- `SUPABASE_URL` — Project URL (`https://[ref].supabase.co`)
- `SUPABASE_SERVICE_KEY` — **service_role** key (not anon)

---

## Step 3 — Repo env files

From the repo root:

```bash
cp .env.development.example .env.development
cp .env.production.example .env.production
cp .env.production-backup.example .env.production-backup
```

Fill in the three **different** `PROJECT_REF` values and passwords. Never commit these files.

Local daily work:

```bash
# Use dev DB while coding (copy or symlink to .env)
cp .env.development .env

npm run db:migrate:deploy:dev
npm run db:seed:dev          # wipes dev data — dev only
npm run start:dev
```

---

## Step 4 — Storage buckets (each project)

In **each** project: **Storage → New bucket**. Create (public if you rely on public URLs):

- `avatars`
- `slider-ads`
- `category-icons`
- `listing-images`
- `facebook-follow-submissions`

Bucket names must match the `SUPABASE_*_BUCKET` vars in that project’s env file.

---

## Step 5 — Apply schema to all three databases

```bash
npm run db:migrate:deploy:dev
npm run db:migrate:deploy:prod
npm run db:migrate:deploy:backup
```

Verify connectivity:

```bash
npm run db:check
```

Seed **development only**:

```bash
npm run db:seed:dev
```

**Never** run `db:seed` against production or backup (it truncates all public tables).

---

## Step 6 — Production server

On the VPS, production should use **only** the production project:

```bash
cp .env.production .env
# or maintain .env.production and: ln -sf .env.production .env
```

Deploy (existing script):

```bash
./deploy.sh
```

`deploy.sh` runs `npm run db:migrate:deploy` using whatever `.env` is on the server.

---

## Step 7 — Production backup project (data refresh)

The backup project keeps the **same schema** via migrations. **Data** is not synced automatically. Refresh periodically:

### Option A — Supabase dashboard restore (simplest)

1. On **flex-prod**: ensure daily backups enabled (Pro includes 7-day daily backups).
2. When you need a fresh backup copy: restore backup to **flex-prod-backup** (or create a new project from backup, then update `.env.production-backup`).

Check Supabase docs for “Restore to a new project” in your plan.

### Option B — `pg_dump` / `pg_restore` (scriptable)

From a machine with PostgreSQL client tools:

```bash
# Dump from production (use DIRECT_URL host, port 5432)
pg_dump "$PROD_DIRECT_URL" --no-owner --no-acl -Fc -f prod.dump

# Restore into backup project (backup must be empty or you use --clean carefully)
pg_restore --no-owner --no-acl -d "$BACKUP_DIRECT_URL" prod.dump
```

Storage files (images) are **not** in Postgres. For full DR, also replicate Storage buckets (Supabase CLI, rclone, or periodic export).

---

## Step 8 — Enable backups on production

On **flex-prod** (Pro):

1. **Database → Backups** — confirm scheduled backups are on.
2. Optional: enable **Point-in-time recovery (PITR)** for finer restore windows (paid add-on).

The backup **project** complements this; it does not replace PITR.

---

## NPM scripts reference

| Command | Target |
|---------|--------|
| `npm run db:migrate:deploy:dev` | `.env.development` |
| `npm run db:migrate:deploy:prod` | `.env.production` |
| `npm run db:migrate:deploy:backup` | `.env.production-backup` |
| `npm run db:seed:dev` | Dev only (destructive) |
| `npm run db:studio:dev` | Prisma Studio → dev |
| `npm run db:check` | Ping all three env files |

---

## Checklist

- [ ] Three Supabase projects created
- [ ] `.env.development`, `.env.production`, `.env.production-backup` filled in
- [ ] Migrations deployed to all three (`npm run db:check` passes)
- [ ] Storage buckets created in all three projects
- [ ] Production VPS `.env` points **only** to prod project
- [ ] Prod daily backups (+ optional PITR) enabled
- [ ] Backup refresh procedure documented in your runbook (monthly drill recommended)
