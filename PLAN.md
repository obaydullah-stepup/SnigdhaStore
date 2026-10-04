# Snigdha — E-commerce Build Plan

Based on `prompt.md` (completed with sections 54–57).

## Goal

Production-ready, premium Bangladeshi e-commerce platform: Next.js full-stack (App Router), TypeScript, Tailwind, shadcn/ui, PostgreSQL + Prisma, server actions, customer storefront + admin dashboard, SEO, analytics-ready, fully tested.

## Tech Decisions (locked)

- **Framework:** Next.js (latest stable) App Router, React, TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui + CSS variables/design tokens (no hard-coded colors)
- **Fonts:** Inter/Geist (EN) + Noto Sans Bengali, variable fonts, swap
- **DB/ORM:** PostgreSQL + Prisma; server actions + route handlers
- **Validation:** Zod everywhere at server boundaries
- **Payment:** `PaymentProvider` interface; COD implemented first
- **Storage:** `StorageProvider` abstraction (Vercel Blob / S3 / Cloudinary)
- **Notifications:** `EmailProvider` interface (Resend/SMTP later)
- **Auth:** email+password, bcrypt/argon2 hashing, sessions (secure cookies), role guards
- **Currency/localization:** BDT ৳, EN + BN i18n-ready architecture

## Database Models (Prisma)

User, Session, Address, Category (hierarchical), Product, ProductImage, ProductVariant, Cart, CartItem, Order (with snapshots), OrderItem, Coupon, Review, InventoryTransaction, OrderTimelineEvent, ShippingConfig, EmailTemplate(optional). All required fields per prompt §6. Indexes: slug, sku, status, orderNumber, categoryId, etc.

## Phases & Milestones

### Phase 1 — Foundation

- Scaffold Next.js + TS + Tailwind + ESLint + Prettier; `src/` structure per prompt §40
- Design tokens: emerald primary, cream secondary, soft gold accent, charcoal text, warm-white bg
- Prisma schema complete; initial migration; seed architecture (5 categories, 30+ products, variants, images, reviews, features)
- Seed admin via `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars
- `.env.example`, README deploy checklist
- Core libs: prisma client, validators, utils, config, constants (divisions/districts of BD)
- **Done when:** app boots, migration runs, seed works, lint/typecheck clean

### Phase 2 — Authentication

- Register / login / logout server actions; Zod schemas; friendly (BN+EN) errors
- Session management; secure cookies; CSRF where applicable
- Password reset flow (architecture + email interface stub)
- Email verification architecture
- Route protection: `/account/*` (CUSTOMER), `/admin/*` (ADMIN) via middleware/layout guards
- Rate limiting on auth endpoints
- Unit tests: hash/verify, auth actions, authorization

### Phase 3 — Storefront Core

- Layout: announcement bar, header (desktop+mobile drawer, search, account, wishlist, cart count), footer
- Home: hero, featured categories, featured/new/best-seller products, promo banner, why-choose, reviews, newsletter, gallery placeholder
- Shop `/shop`: grid, search, category/price/availability/rating filters, sorting, pagination (skip/infinite), mobile drawer filters
- Category `/category/[slug]`: banner, description, breadcrumb, dynamic metadata
- Product `/product/[slug]`: gallery w/ zoom + thumbnails + swipe, variants, qty, add-to-cart, buy-now, wishlist, description, specs, shipping/returns, reviews + rating distribution, related + recently viewed
- Search `/search?q=`: suggestions, recent searches, results, filters, sorting, empty state; debounced
- Components: product cards, skeletons, empty states, toasts

### Phase 4 — Commerce Core

- Cart: server-persisted cart (user + session guest), instant optimistic updates, qty/remove/save-for-later, subtotal, coupon input, delivery estimate, total
- Checkout `/checkout`: multi-step (info → address → delivery → payment → review); BD divisions/districts/areas; delivery methods (standard/express) from config; payment abstraction (COD); live order review
- Order creation server action in `$transaction`: validate stock/variants, recalc prices server-side, validate coupon, compute delivery fee + total, snapshots → OrderItem, atomic stock decrement + InventoryTransaction, clear cart, generate `SNG-YYYYMMDD-NNNN`
- Order confirmation `/order-success/[orderNumber]`
- Coupon validation (server-side only)
- **Done when:** full purchase path works from browse → order; no client-trusted prices

### Phase 5 — Customer Account

- `/account` dashboard overview
- Orders list + order detail `/account/orders/[orderId]` with visual status timeline
- Profile, addresses (CRUD, default), wishlist, reviews (verified-purchase only badge), password
- Empty states for no orders/wishlist/reviews
- [x] **Done** — account shell + sidebar nav (fixed `bg-warm-white`), overview stats (orders/spent/wishlist/reviews, latest order, default address, verify banner), orders list + detail with visual timeline + ownership guard (foreign/bogus id → 404), address CRUD + default (BD division/district form), wishlist with move-to-cart, reviews gated to delivered purchases (unreviewed eligible products, moderation state, delete), profile (name/phone) + password change with current-password check, empty states throughout. Verified: typecheck, eslint, prettier, 32 tests, production build, runtime smoke (all account pages 200 for auth user, unauth `/account` redirects to `/login?next=`, review-form renders only for eligible delivered product).

### Phase 6 — Admin Dashboard

- `/admin` layout with sidebar + admin guard; all sections:
- Overview: stat cards (sales, orders, customers, products, low stock, pending), charts (revenue/orders over time, sales by category, top products), date filters
- Products: table + editor, images upload (StorageProvider — `local` provider via `/api/uploads` in dev; `supabase` provider with `createSignedUploadUrl` presigned PUT on Vercel), variants, SEO fields, publish/featured toggles, delete
- Orders: list/filter/search, detail w/ timeline, status + payment updates, internal notes
- Customers: list, spend/orders, detail w/ history
- Categories: CRUD, image, sort, activate/deactivate
- Coupons: CRUD, expiry, limits, min order
- Inventory: stock, low-stock alerts, adjustments, history
- Reviews: moderation approve/hide
- Settings: shipping config (fees, free threshold, zones), store info
- Charts via recharts; server-validated forms; table skeletons

### Phase 7 — Quality & Production

- [x] SEO: metadata API per route, OG/Twitter, canonical, sitemap.xml, robots.txt, structured data (Product/Organization/Breadcrumb)
- [x] Analytics abstraction: providers (GA4/GTM/Meta) + track events (view, add2cart, checkout, purchase, search, wishlist, coupon)
- [x] Performance: only Server Components where possible, image optimization + lazy loading, dynamic imports, caching, pagination, indexed queries — `e2e/audit-perf.spec.ts` (warm TTFB 265–517ms, DOM 1.1–3.7s vs 2000ms/4000ms budgets)
- [x] Accessibility: semantic HTML, focus, labels, contrast, keyboard nav, ARIA only when needed — `e2e/audit-a11y.spec.ts` axe-core WCAG A/AA + best-practice on `/` and `/shop`: 0 violations (eyebrow+badge contrast tokens, heading order, announcement-bar landmark fixed)
- [x] Error boundaries (global + route-level storefront/admin), not-found pages (root/storefront/admin), loading skeletons (storefront shop/product/category)
- [x] Tests: unit/integration (auth, product creation, cart calc, coupon validation, checkout calc, order creation, stock deduction, admin auth) — 45 passing
- [x] Tests: e2e (register, login, browse, add-to-cart, checkout, place/view order) — Playwright 1.63: `e2e/customer-journey.spec.ts` (full golden path) + perf/a11y audits, 3 passing against prod build

## Milestone Checklist

1. [x] Phase 1 — Foundation boots + seeds
2. [x] Phase 2 — Auth + guards tested
3. [x] Phase 3 — Storefront feature-complete
4. [x] Phase 4 — Full checkout + orders in transaction
5. [x] Phase 5 — Customer account complete
6. [x] Phase 6 — Admin dashboard complete (7-admin routes + new + inventory + orders detail all 200 in prod build; row actions/filters serializable)
7. [x] Phase 7 — SEO/analytics/perf/a11y/tests pass; production build clean
8. [x] Phase 8 — Image storage on Vercel: `StorageProvider` abstraction (`local` | `supabase`), admin-gated `createProductImageUploadAction` returns presigned PUT (`createSignedUploadUrl`), client uploads bytes directly to Supabase (no serverless body limit), `imageList` JSON replaces multipart `File` fields (5 MB/MIME validated client + server, order-preserving upsert, 401 on unauth PUT), `*.supabase.co` in `images.remotePatterns` — typecheck, eslint, 50 unit tests, prod build, e2e all green

## Conventions During Build

- `tsc --noEmit`, `eslint`, `prettier --check` must pass before each phase is marked done
- Prisma: `prisma format` + migration per schema change
- No `any`, no `TODO/FIXME`, no lorem ipsum
- All prices/stock/discounts/roles validated server-side; never trust the client

## Verification Commands

- `npm run lint`
- `npx tsc --noEmit`
- `npm test` (unit/integration)
- `npm run test:e2e` (Playwright)
- `npm run build` (production build must succeed)
- Lighthouse (desktop + mobile) per key pages
