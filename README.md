# Stock & Sales Tracker

A Next.js app replacing manual Excel tracking of electronic-component inventory,
purchase orders, and sales with a hosted, multi-user, authenticated website.

Phase 1 covers full CRUD on every genuinely raw/manually-entered field from the
two source workbooks, plus a re-importable Excel upload. Sheets/columns that
are pure Excel-formula output (totals, stock ratios, running depletion
projections) are imported as read-only reference reports under **Reports**
rather than recalculated — see `.claude/plans` (or ask) for the Phase 2 plan
to rebuild specific formulas on request.

## Stack

- Next.js 16 (App Router, TypeScript), deployed on Vercel
- PostgreSQL via [Neon](https://neon.tech), accessed through Prisma 7 (`@prisma/adapter-pg`)
- Auth.js v5, credentials login, roles `ADMIN` / `EDITOR` / `VIEWER`
- `exceljs` for parsing uploaded workbooks

## Local development

1. `npm install`
2. Set `DATABASE_URL` in `.env` to a local or hosted Postgres instance (see below for a
   zero-install local option), and set `AUTH_SECRET` to any random string.
3. `npx prisma db push` — applies the schema.
4. `npm run db:seed` — creates the first `ADMIN` user (employee number `002`, password
   `Pass1234` by default; override with `SEED_ADMIN_EMPLOYEE_NUMBER` / `SEED_ADMIN_PASSWORD` /
   `SEED_ADMIN_NAME` env vars). **Change this password after first login.**
5. `npm run dev`, then sign in at [http://localhost:3000/login](http://localhost:3000/login).
6. Go to **Import Excel** and upload the two source workbooks to load real data.

### Zero-install local Postgres

`npx prisma dev` starts a local Postgres server and prints a `DATABASE_URL` to
paste into `.env`. Run it in a separate terminal and leave it running during
development.

## Deploying (Vercel + Neon)

1. Create a Neon Postgres database (or via the Vercel Postgres/Neon integration
   from your Vercel project's Storage tab).
2. In the Vercel project's environment variables, set:
   - `DATABASE_URL` — the Neon **pooled** connection string (hostname contains
     `-pooler`), used for normal app queries.
   - `DIRECT_DATABASE_URL` — the Neon **unpooled** connection string (same
     hostname without `-pooler`). Used only by `prisma migrate deploy` — Neon's
     PgBouncer pooler can multiplex the advisory lock Prisma Migrate takes
     across sessions, which otherwise surfaces as a `P1002` timeout
     (`Timed out trying to acquire a postgres advisory lock`) on deploy.
   - `AUTH_SECRET` — a random secret (e.g. `openssl rand -base64 32`)
3. Deploy. The build (`npm run build`) automatically runs, in order:
   `prisma generate` → `prisma migrate deploy` (applies `prisma/migrations`
   against `DATABASE_URL`) → `prisma/seed.ts` (idempotent — creates the first
   `ADMIN` user, employee number `002` / password `Pass1234` by default, and
   does nothing if that employee number already exists) → `next build`. No
   manual database step is needed; every deploy keeps the schema and seed
   admin account up to date on its own.
4. Log in, change the seeded admin password (Users → your account → reset
   password), and create real accounts for other users.

## PWA support

The app is installable (Android/desktop Chrome, iOS Safari "Add to Home
Screen") — manifest at `src/app/manifest.ts`, icons generated on the fly from
`src/lib/pwaIcon.tsx` via `next/og` (`src/app/icon.tsx`, `apple-icon.tsx`, and
the `/icon-192`, `/icon-512`, `/icon-512-maskable` routes). A minimal service
worker (`public/sw.js`, registered by `src/components/PwaRegister.tsx`) caches
the app shell for a friendly `/offline` page and speeds up repeat loads of
`_next/static` assets — it deliberately does **not** cache API/data responses,
since this is a live multi-user app, not an offline-first one. The service
worker only registers in production builds (`npm run build && npm start`) —
it's intentionally skipped in `npm run dev` since Turbopack's dev-mode chunk
reloading conflicts with the cache-first assumption for static assets.

## Discord alerts for negative stock

Optional: set `DISCORD_WEBHOOK_URL` (locally in `.env`, or as a Vercel
environment variable) to get a Discord notification whenever a part's
on-hand stock goes negative — Ecomp Parts' Inventory Qty or JSCPH Parts'
Delivery Adjustment BOH — from either a manual edit or an Excel import.

To create the webhook: in Discord, go to **Server Settings → Integrations →
Webhooks → New Webhook**, pick the channel, then **Copy Webhook URL**.

Notes on the behavior (`src/lib/discord.ts`):
- Only fires on the *transition* into negative (i.e. not on every save while
  a value stays negative) — avoids repeat alerts for a part that's known to
  already be negative.
- Bulk imports send **one** summary message listing everything that went
  negative in that import, rather than one message per row (avoids spamming
  the channel and hitting Discord's webhook rate limit).
- If `DISCORD_WEBHOOK_URL` isn't set, this is a no-op — nothing breaks.

## Data model notes

- Each entity that maps to a raw/editable Excel column has full CRUD in the
  UI. Parts with many related sub-tables (`EcompPart`, `JscphPart`,
  `OpenPoLine`) have a detail page (`/…/[id]`) showing their child records
  (customer demand, PO price entries, daily deliveries, etc.) inline.
- Re-importing a workbook matches existing rows by natural key (ICS, part
  code, PO number, date, etc.) and updates them in place. It never deletes
  rows that are missing from the new file, so manual edits/additions made
  through the site survive re-imports.
- Fully formula-derived sheets (`tbl_SalesAmount`, `SPQ_Check`,
  `STOCK RATIO RESIN`, `RUNNING STOCK (Resin)`) are imported wholesale into
  `ComputedSheetSnapshot` and shown read-only under **Reports**, with CSV
  export.
