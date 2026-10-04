Snigdha — Full E-commerce Website Development Prompt

1. Project Overview
   Build a complete, modern, production-ready e-commerce website named “Snigdha” using Next.js.

Snigdha should feel like a premium, trustworthy, elegant, fast, and modern Bangladeshi e-commerce brand.

The website must be fully responsive and optimized for:

Desktop

Tablet

Mobile

The project should be written with clean, scalable, maintainable, production-quality code.

Do not build a simple demo or landing page. Build a complete functional e-commerce platform with customer-facing storefront, authentication, cart, checkout, order management, customer dashboard, admin dashboard, product management, inventory management, coupon system, payment integration architecture, SEO, analytics-ready architecture, and proper error/loading states.

2. Brand
   Brand Name
   Snigdha

Brand Personality
Elegant

Minimal

Premium

Trustworthy

Modern

Warm

Clean

User-friendly

The UI should not look like a generic template.

Use a sophisticated visual hierarchy, generous whitespace, subtle animations, premium typography, rounded cards, elegant buttons, and high-quality product presentation.

Avoid excessive gradients, excessive shadows, cluttered layouts, or unnecessary animations.

3. Target Market
   Primary market:

Bangladesh

Currency:

BDT (৳)

Language:

Bengali

English

The architecture should support internationalization, but initially optimize the experience for Bangladeshi customers.

Use Bangladesh-specific checkout information such as:

Customer name

Phone number

Email

Division

District

Area

Full address

Delivery instructions

4. Recommended Tech Stack
   Use the latest stable versions compatible with the project.

Frontend
Next.js

React

TypeScript

Tailwind CSS

shadcn/ui

Lucide Icons

Use the Next.js App Router.

Prefer Server Components wherever appropriate.

Use Client Components only when interactivity requires them.

5. Backend Architecture
   Use Next.js as the main full-stack application.

Recommended:

Next.js Server Actions

Route Handlers / API Routes where appropriate

PostgreSQL

Prisma ORM

The architecture should make it easy to deploy to platforms such as Vercel.

6. Database
   Use PostgreSQL with Prisma.

Create a properly normalized database schema.

Required models should include at minimum:

User
Fields:

id

name

email

phone

passwordHash

role

image

emailVerified

createdAt

updatedAt

Roles:

CUSTOMER

ADMIN

Address
Fields:

id

userId

name

phone

division

district

area

addressLine

postalCode

isDefault

createdAt

updatedAt

Category
Fields:

id

name

slug

description

image

isActive

createdAt

updatedAt

Support hierarchical categories if necessary.

Product
Fields:

id

name

slug

shortDescription

description

price

compareAtPrice

costPrice

sku

stock

categoryId

brand

featured

published

status

seoTitle

seoDescription

createdAt

updatedAt

ProductImage
Fields:

id

productId

url

alt

sortOrder

ProductVariant
Support variants such as:

Size

Color

Weight

Material

Fields:

id

productId

name

sku

price

stock

attributes

Cart
Fields:

id

userId

sessionId

createdAt

updatedAt

CartItem
Fields:

id

cartId

productId

variantId

quantity

price

Order
Fields:

id

orderNumber

userId

status

paymentStatus

paymentMethod

subtotal

discount

deliveryFee

total

customerName

customerPhone

customerEmail

shippingAddress

notes

createdAt

updatedAt

Order statuses:

PENDING

CONFIRMED

PROCESSING

SHIPPED

DELIVERED

CANCELLED

RETURNED

OrderItem
Fields:

id

orderId

productId

variantId

productName

sku

quantity

price

total

Store product snapshots so historical orders remain accurate even if products change later.

Coupon
Fields:

id

code

type

value

minimumOrder

maximumDiscount

usageLimit

usedCount

startsAt

expiresAt

isActive

Coupon types:

PERCENTAGE

FIXED

Review
Fields:

id

userId

productId

orderId

rating

title

comment

isApproved

createdAt

updatedAt

Only allow verified purchasers to submit product reviews.

7. Authentication
   Implement secure authentication.

Support:

Email/password login

Registration

Logout

Password reset

Email verification architecture

Protected customer routes

Protected admin routes

Use secure password hashing.

Never store plain-text passwords.

Implement proper session management.

8. Main Website Pages
   Create the following pages.

Home
Route:

/

Sections:

Announcement bar

Header

Navigation

Hero section

Featured categories

Featured products

New arrivals

Best sellers

Promotional banner

Why choose Snigdha

Customer reviews

Newsletter subscription

Instagram/social-style gallery placeholder

Footer

Hero section should have:

Premium visual

Strong headline

Short supporting text

Primary CTA

Secondary CTA

Product/lifestyle image

9. Header
   Desktop header:

Logo

Home

Shop

Categories

New Arrivals

Best Sellers

About

Contact

Search

Account

Wishlist

Cart

Mobile header:

Hamburger

Logo

Search

Cart

Create a polished mobile navigation drawer.

Show cart item count.

10. Shop Page
    Route:

/shop

Features:

Product grid

Search

Category filtering

Price filtering

Sorting

Availability filtering

Rating filtering

Pagination or infinite loading

Sorting options:

Featured

Newest

Price low to high

Price high to low

Best selling

Highest rated

Mobile filters should appear in a bottom sheet or drawer.

11. Category Page
    Route:

/category/[slug]

Show:

Category banner

Category description

Breadcrumb

Products

Filters

Sorting

Pagination

SEO metadata should be generated dynamically.

12. Product Details
    Route:

/product/[slug]

Include:

Image gallery

Product title

Rating

Review count

Price

Compare-at price

Discount percentage

Stock status

SKU

Variant selection

Quantity selector

Add to cart

Buy now

Wishlist

Product description

Specifications

Shipping information

Return policy

Reviews

Related products

Recently viewed products

Product images should support:

Zoom

Thumbnail navigation

Mobile swipe gallery

13. Search
    Create a dedicated search experience.

Route:

/search?q=

Features:

Search products

Search suggestions

Recent searches

Product result count

Filters

Sorting

Empty state

Debounce search input.

Search should be optimized for performance.

14. Cart
    Route:

/cart

Features:

Product image

Product name

Variant

Price

Quantity controls

Remove item

Save for later

Subtotal

Coupon

Delivery estimate

Total

Checkout CTA

Cart should update instantly without unnecessary page reloads.

15. Checkout
    Route:

/checkout

Create a clean multi-step checkout.

Steps:

Step 1 — Customer Information
Name

Phone

Email

Step 2 — Shipping Address
Division

District

Area

Address

Postal code

Delivery instructions

Step 3 — Delivery Method
Examples:

Standard Delivery

Express Delivery

Step 4 — Payment
Initially support:

Cash on Delivery

Create a payment abstraction so online payment gateways can be added later.

Possible future integrations:

SSLCommerz

bKash

Nagad

Stripe

Step 5 — Order Review
Show:

Products

Quantity

Subtotal

Discount

Delivery fee

Total

Shipping address

Payment method

CTA:

Place Order

16. Order Confirmation
    Route:

/order-success/[orderNumber]

Show:

Success message

Order number

Order summary

Delivery address

Payment method

Total

Estimated delivery

Continue shopping

View order

17. Customer Account
    Route:

/account

Dashboard should include:

Overview

Orders

Order details

Profile

Addresses

Wishlist

Reviews

Password/security

Logout

18. Order Tracking
    Route:

/account/orders/[orderId]

Show timeline:

Order placed

Confirmed

Processing

Shipped

Out for delivery

Delivered

Use a beautiful visual timeline.

19. Wishlist
    Route:

/wishlist

Features:

Product grid

Add to cart

Remove

Stock status

Price

Empty state

20. Reviews
    Customers can review products after successful delivery.

Features:

Star rating

Review title

Comment

Optional image

Verified purchase badge

Admin moderation

Display:

Average rating

Rating distribution

Customer reviews

21. Admin Dashboard
    Create a completely separate admin dashboard.

Route:

/admin

Only ADMIN users can access it.

Dashboard sections:

Overview

Orders

Products

Categories

Customers

Inventory

Coupons

Reviews

Analytics

Settings

22. Admin Dashboard Overview
    Show cards:

Total sales

Orders

Customers

Products

Low stock products

Pending orders

Charts:

Revenue over time

Orders over time

Sales by category

Top products

Add date filters:

Today

7 days

30 days

90 days

Custom

23. Admin Product Management
    Route:

/admin/products

Features:

Product table

Search

Filter

Sort

Add product

Edit product

Delete product

Publish/unpublish

Featured toggle

Stock management

Product editor:

Name

Slug

Description

Images

Price

Compare price

SKU

Stock

Category

Variants

SEO fields

Status

Use image upload architecture.

24. Admin Order Management
    Route:

/admin/orders

Features:

Order list

Search by order number

Search by customer

Filter by status

Filter by payment status

View order

Update status

Update payment status

Order details:

Customer

Items

Shipping

Payment

Timeline

Internal notes

25. Admin Customer Management
    Route:

/admin/customers

Show:

Customer name

Email

Phone

Number of orders

Total spent

Registration date

Account status

Customer details should show order history.

26. Admin Category Management
    Features:

Create category

Edit category

Delete category

Upload category image

Activate/deactivate

Sort categories

27. Coupon Management
    Admin should be able to:

Create coupon

Edit coupon

Delete coupon

Activate/deactivate

Set expiry

Set usage limit

Set minimum order

Set percentage discount

Set fixed discount

Validate coupons server-side.

Never trust client-side discount calculations.

28. Inventory
    Create an inventory management system.

Features:

Current stock

Low stock warning

Out of stock

Stock adjustment

Inventory history

Create low-stock alerts in admin.

29. Payment Architecture
    Implement payment methods using an abstraction/interface.

Example architecture:

interface PaymentProvider {
createPayment(): Promise<PaymentResult>
verifyPayment(): Promise<VerificationResult>
refundPayment(): Promise<RefundResult>
}

Initially implement:

Cash on Delivery

Keep architecture ready for:

SSLCommerz

bKash

Nagad

Stripe

Payment verification must always happen server-side.

30. Shipping
    Create configurable delivery settings.

Admin should be able to configure:

Standard delivery fee

Express delivery fee

Free shipping threshold

Delivery zones

Example:

Dhaka

Outside Dhaka

Keep the system extensible for future courier APIs.

31. Notifications
    Create notification architecture.

Support:

Order confirmation

Order status update

Payment confirmation

Delivery notification

Password reset

Promotional notifications

Initially create email notification interfaces that can later connect to services such as Resend, SendGrid, or SMTP.

32. SEO
    Implement strong technical SEO.

Include:

Metadata

Dynamic metadata

Open Graph

Twitter cards

Canonical URLs

Sitemap

Robots.txt

Structured data

Product schema

Breadcrumb schema

Organization schema

Generate dynamic metadata for:

Products

Categories

Blog/content pages

33. Performance
    The website must be fast.

Use:

Server Components

Image optimization

Lazy loading

Dynamic imports where appropriate

Proper caching

Pagination

Database indexing

Optimized queries

Minimal client-side JavaScript

Avoid unnecessary API calls.

Use skeleton loading states.

Target excellent Lighthouse scores.

34. Accessibility
    Follow WCAG principles.

Requirements:

Semantic HTML

Keyboard navigation

Focus states

Accessible forms

Proper labels

Alt text

ARIA only when necessary

Sufficient color contrast

Screen-reader-friendly components

35. Responsive Design
    Mobile-first design.

Test layouts for:

320px

375px

390px

414px

768px

1024px

1280px

1440px+

Do not allow:

Horizontal overflow

Broken grids

Tiny buttons

Unusable filters

Overlapping content

36. UI/UX
    Create a premium design system.

Use:

Consistent spacing

Consistent border radius

Consistent shadows

Consistent typography

Elegant hover effects

Smooth transitions

Skeleton loaders

Toast notifications

Confirmation dialogs

Empty states

Error states

Buttons should clearly communicate actions.

Do not overuse animations.

37. Color System
    Create a sophisticated Snigdha brand palette.

Suggested direction:

Primary
Deep emerald / forest green

Secondary
Warm cream / off-white

Accent
Soft gold / muted beige

Text
Dark charcoal

Background
Warm white

Do not hard-code colors throughout the project.

Use CSS variables / design tokens.

Make the palette easy to change later.

38. Typography
    Use a modern premium font pairing.

Support Bengali typography properly.

Suggested approach:

English: Inter / Geist

Bengali: Noto Sans Bengali

Make typography responsive.

39. Components
    Create reusable components.

Examples:

components/
├── ui/
├── layout/
├── header/
├── footer/
├── product/
├── cart/
├── checkout/
├── account/
├── admin/
├── forms/
├── filters/
├── reviews/
├── search/
└── shared/

Avoid creating giant components.

Break complex UI into reusable components.

40. Recommended Project Structure
    Use a clean structure similar to:

src/
├── app/
│ ├── (store)/
│ │ ├── page.tsx
│ │ ├── shop/
│ │ ├── product/
│ │ ├── category/
│ │ ├── search/
│ │ ├── cart/
│ │ ├── checkout/
│ │ ├── wishlist/
│ │ └── order-success/
│ │
│ ├── (auth)/
│ │ ├── login/
│ │ ├── register/
│ │ ├── forgot-password/
│ │ └── reset-password/
│ │
│ ├── account/
│ │ ├── page.tsx
│ │ ├── orders/
│ │ ├── addresses/
│ │ ├── wishlist/
│ │ └── settings/
│ │
│ ├── admin/
│ │ ├── page.tsx
│ │ ├── products/
│ │ ├── orders/
│ │ ├── customers/
│ │ ├── categories/
│ │ ├── coupons/
│ │ ├── inventory/
│ │ └── settings/
│ │
│ └── api/
│
├── components/
├── lib/
├── actions/
├── hooks/
├── services/
├── types/
├── config/
└── styles/

41. Server-Side Security
    Implement security best practices.

Requirements:

Server-side authorization

Input validation

Zod schemas

SQL injection protection through Prisma

CSRF protection where applicable

Rate limiting for sensitive endpoints

Secure cookies

Password hashing

Admin route protection

Server-side price validation

Server-side stock validation

Server-side coupon validation

Server-side order total calculation

Never trust:

Client price

Client discount

Client stock

Client role

Client order total

42. Validation
    Use Zod.

Create reusable validation schemas for:

Registration

Login

Product

Category

Address

Checkout

Coupon

Review

Admin forms

Display friendly validation messages.

Support Bengali-friendly error messages where appropriate.

43. Error Handling
    Implement:

Global error page

Not found page

Route-level error boundaries

API error handling

Form errors

Database error handling

Loading states

Empty states

Never expose sensitive server errors to users.

44. Product Data
    Create realistic seed data.

At minimum:

5 categories

30 products

Product images

Prices

Stock

Variants

Product descriptions

Ratings/reviews

Featured products

Do not use lorem ipsum.

Use realistic Snigdha-style product content.

45. Seed Admin
    Create a development admin account through environment variables.

Example:

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password

Never hard-code production credentials.

46. Environment Variables
    Create:

DATABASE_URL=
AUTH_SECRET=

NEXT_PUBLIC_APP_URL=

ADMIN_EMAIL=
ADMIN_PASSWORD=

EMAIL_FROM=
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=

PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_SECRET_KEY=

STORAGE_PROVIDER=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

Create .env.example.

Never commit .env.

47. Image Storage
    Create an abstraction for product image storage.

The implementation should be compatible with:

Cloudinary

AWS S3

Vercel Blob

Images must use optimized Next.js image handling.

48. Analytics
    Create an analytics abstraction.

Prepare support for:

Google Analytics

Meta Pixel

Google Tag Manager

Track events such as:

Product viewed

Add to cart

Begin checkout

Purchase

Search

Wishlist

Coupon applied

Do not hard-code vendor-specific logic everywhere.

49. Testing
    Add tests for important functionality.

At minimum test:

Authentication

Product creation

Cart calculation

Coupon validation

Checkout calculation

Order creation

Stock deduction

Admin authorization

Also add end-to-end tests for:

Register

Login

Browse products

Add to cart

Checkout

Place order

View order

50. Important Business Logic
    Cart
    When adding a product:

Verify product exists

Verify product is published

Verify stock

Verify variant

Calculate price server-side

Checkout
Before creating an order:

Fetch products from database

Validate stock

Validate variants

Recalculate prices

Validate coupon

Calculate delivery fee

Calculate final total

Create order

Create order items

Decrease inventory atomically

Clear cart

Use a database transaction.

51. Order Number
    Generate human-friendly unique order numbers.

Example:

SNG-20260921-0001

The format should be configurable.

52. Empty States
    Create polished empty states for:

Empty cart

Empty wishlist

No orders

No search results

No products

No reviews

No customers

No coupons

Each empty state should have:

Icon/illustration

Helpful message

Relevant CTA

53. Loading States
    Every data-heavy page should have skeleton loading UI.

Create:

Product skeleton

Product detail skeleton

Table skeleton

Dashboard skeleton

Order skeleton

Cart skeleton

Avoid blank screens while loading.

54. Deployment
    The project must be easy to deploy, especially to Vercel.

Requirements:

Working production build

Production-ready Docker/`vercel.json` configuration (if needed)

PostgreSQL provider ready for managed services such as Neon or Supabase

Prisma migrations committed and documented

`.env.example` committed with all variables documented

`.env` must never be committed

Deploy checklist documented in the README:

Database migration steps

Seeding command

Admin account creation

Environment variable setup

55. Development Phases & Milestones
    Build the project in clearly defined phases. Each phase must be fully functional before moving to the next.

Phase 1 — Foundation
Initialize Next.js + TypeScript + Tailwind CSS

Install shadcn/ui and design tokens

Set up ESLint, Prettier, and directory structure

Configure Prisma + PostgreSQL schema and base migrations

Create `.env.example` and seed architecture

Phase 2 — Authentication
Registration, login, logout

Session management & protected route guards

Password reset architecture

Email verification architecture

Admin role gating

Phase 3 — Storefront Core
Home page

Header, navigation, mobile drawer, footer

Shop page with filters, sorting, pagination

Category page

Product detail page (gallery, variants, reviews, related products)

Search experience

Phase 4 — Commerce Core
Cart (client + persisted server cart)

Checkout multi-step flow

Order creation with transaction, stock deduction, order numbers

Order confirmation

Coupon system

Payment abstraction + Cash on Delivery

Phase 5 — Customer Account
Dashboard overview

Orders list + order tracking timeline

Profile, addresses, wishlist

Reviews submission

Phase 6 — Admin Dashboard
Overview with analytics + charts

Product management + inventory

Order management

Category management

Customer management

Coupon management

Review moderation

Settings (shipping, delivery fees, zones)

Phase 7 — Quality & Production
SEO (metadata, sitemap, robots, structured data)

Analytics abstraction + tracking

Performance pass (skeletons, caching, image optimization)

Accessibility pass

Error boundaries, loading, empty states

56. Acceptance Criteria / Definition of Done
    A feature is done only when all of the following hold:

Implemented per the specification in this prompt

Runs without TypeScript errors (`tsc --noEmit`)

Passes ESLint without warnings

Reasonably covered by unit/integration tests for business logic

No `any`, no `TODO`, no `FIXME`, no placeholder text in production code

No hard-coded colors, prices, stock, or roles in client components — all server-validated

Responsive at 320 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1440+ px with no horizontal overflow

Has loading skeleton, empty state, and error state

Has proper generated metadata (SEO) where relevant

No secrets or real credentials committed

57. Code Quality Standards
    Follow strict code quality practices throughout the project:

TypeScript strict mode

Server Components by default; Client Components only for interactivity

Reusable, small components — no giant files

Consistent naming conventions

Zod validation on every server boundary

Server-side authorization on every protected action

Business-critical transactions wrapped in Prisma `$transaction`

Comments only where they explain unavoidable complexity (no decorative comments)

Conventional commit messages during development

PRs/commits must pass lint, type check, and tests before merge

(End of file — total completed)
