# Snigdha — Bangladeshi Craft & Fashion E‑commerce

A Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 e‑commerce platform for handloom
sarees, jewelry, home decor, and snacks. Brand palette: emerald, cream, gold, charcoal, warm‑white.

> ⚠️ **This codebase uses Next.js 16.3** with breaking changes vs. older Next.js (async
> `params`/`searchParams`/`cookies()`, `proxy.ts` instead of `middleware.ts`, ambient `LayoutProps`).
> Read the bundled version‑matched docs in `node_modules/next/dist/docs/` before writing route code.

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | Next.js 16.3 (App Router) · React 19                          |
| Language   | TypeScript (strict)                                           |
| Styling    | Tailwind CSS v4 · shadcn/ui primitives (Base UI)              |
| Database   | PostgreSQL via Prisma 7 (`@prisma/adapter-pg` + driver adapter) |
| Validation | Zod                                                           |
| Auth       | Cookie sessions (email/password, `bcryptjs`) — Phase 2        |

## Project layout

```
src/
  app/            App Router pages, actions, API routes (proxy.ts for guards)
  components/     ui/ (shadcn) + feature components
  config/         env.ts (Zod), site.ts
  constants/      bangladesh.ts (divisions, districts, delivery methods)
  generated/      prisma/  — generated client (git-ignored)
  lib/            prisma.ts (client singleton), utils.ts
  middleware/     proxy.ts (app-router auth guards)   [Phase 2]
prisma/
  schema.prisma   full data model
  migrations/     versioned SQL migrations
  seed.ts         demo data (31 products, 5 categories, admin, orders, coupons)
```

## Getting started

Prerequisites: Node.js ≥ 20, and a PostgreSQL database (hosted — e.g. **Supabase** via its
**Session pooler** URL; direct `db.<ref>.supabase.co` is IPv6‑only and often unreachable on the
standard IPv4 stacks).

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure environment

   ```bash
   cp .env.example .env
   ```

   Set at minimum:

   ```dotenv
   DATABASE_URL="postgresql://USER:PGPASSWORD@HOST:5432/db?sslmode=require&uselibpqcompat=true&schema=public"
   AUTH_SECRET="<openssl rand -base64 32>"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="<pick-a-strong-password>"
   ```

   > Note for Supabase pooler connections: keep `sslmode=require&uselibpqcompat=true` so the
   > `pg` driver encrypts without strict cert-chain verification (Supabase's cert chain is not in
   > Node's default trust store; plain `sslmode=require` is treated as `verify-full` by pg v8 and
   > fails). Prisma CLI reads `DATABASE_URL` from `prisma.config.ts`, which loads `.env`.

3. Run migrations + seed (creates schema and demo data)

   ```bash
   npm run db:migrate      # prisma migrate dev --name <change>
   npm run db:seed         # idempotent: clears + reseeds
   ```

4. Run the dev server

   ```bash
   npm run dev             # http://localhost:3000
   ```

## Seed credentials

| Role   | Email                | Password           |
| ------ | -------------------- | ------------------ |
| Admin  | `admin@example.com`  | `admin-snigdha-2026` |
| Customer | `customer@example.com` | `customer-123456`   |

## Common commands

```bash
npm run dev          # start dev server (Turbopack)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run db:generate  # prisma generate
npm run db:migrate   # create + apply migration (dev)
npm run db:deploy    # apply pending migrations (prod)
npm run db:push      # push schema without migration history
npm run db:seed      # reseed demo data
npm run db:studio    # prisma studio
```

## Deployment checklist

Production targets: Vercel (hosting) + Supabase/Neon (Postgres) + Vercel Blob (images) + your
email/SMS relays.

- [ ] **Database** — create the production Postgres DB; point `DATABASE_URL` at it (pooler URL).
- [ ] **Migrate** — run `npm run db:deploy` against the production DB. Never run `db:migrate`/`db:push`
      against prod except to author new versions.
- [ ] **Environment variables** — set every var from `.env.example` in the hosting dashboard
      (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, payment keys, storage keys, email SMTP).
      Rotate `AUTH_SECRET` before going live; never hardcode secrets in the repo.
- [ ] **Administrator** — after `db:deploy`, run the seed once or create the admin user; verify the
      admin role works. Change `ADMIN_PASSWORD` from the seed default.
- [ ] **Images** — update `next.config.ts` `remotePatterns` to the image/CDN host actually used in prod
      (dev uses `picsum.photos`).
- [ ] **Payment** — wire a real provider (COD is default `PAYMENT_PROVIDER=cod`); set the gateway keys,
      webhook URLs, and refund flows.
- [ ] **Email/SMS** — configure outbound email (order confirmations) and, if required, SMS for COD
      delivery updates.
- [ ] **Build & health** — `npm run build` must pass; smoke-test the homepage, product pages, cart,
      checkout, and admin panel against the prod DB before switching DNS.
- [ ] **Send in production is checked** (send more) — enable `Send in production` once the first batch
      is ready.
- [ ] **Observability** — add error tracking (Sentry), uptime monitoring, and DB backup jobs.
- [ ] **Environment-cutoff** — disable the seed (it clears data) on prod: guard `db:seed` with
      `NODE_ENV !== production` or a `SEED_ALLOWED` flag.

## Phase roadmap

Per `PLAN.md` — Phase 1 (foundation: scaffold, schema, seed) is complete. Ahead: auth (Phase 2),
catalog & browsing (Phase 3), cart & checkout (Phase 4), my account & reviews (Phase 5), admin panel
(Phase 6), production hardening (Phase 7).