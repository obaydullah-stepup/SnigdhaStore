-- Landing page support for content pages.
--
-- ContentPage and ShippingZone were originally created with `prisma db push`
-- and never captured in migration history, so a fresh database built from the
-- migrations alone is missing both tables. They are created here with
-- IF NOT EXISTS: existing databases keep their data, fresh databases get the
-- same shape as the live one.

DO $$ BEGIN
  CREATE TYPE "PageType" AS ENUM ('TEXT', 'LANDING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ShippingZone" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  -- Nullable to match the existing table; Prisma's String[] maps to a
  -- nullable array here, and shipping queries already treat it as optional.
  "divisions" TEXT[],
  "matchesAll" BOOLEAN NOT NULL DEFAULT false,
  "standardFee" INTEGER NOT NULL DEFAULT 60,
  "expressFee" INTEGER NOT NULL DEFAULT 120,
  "freeShippingThreshold" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ShippingZone_isActive_idx" ON "ShippingZone"("isActive");

CREATE TABLE IF NOT EXISTS "ContentPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "PageType" NOT NULL DEFAULT 'TEXT',
  "content" TEXT NOT NULL DEFAULT '',
  "html" TEXT,
  "css" TEXT,
  "js" TEXT,
  "useTailwindCdn" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContentPage_slug_key" ON "ContentPage"("slug");

-- Landing page columns, for databases that already have ContentPage.
ALTER TABLE "ContentPage" ADD COLUMN IF NOT EXISTS "type" "PageType" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "ContentPage" ADD COLUMN IF NOT EXISTS "html" TEXT;
ALTER TABLE "ContentPage" ADD COLUMN IF NOT EXISTS "css" TEXT;
ALTER TABLE "ContentPage" ADD COLUMN IF NOT EXISTS "js" TEXT;
ALTER TABLE "ContentPage" ADD COLUMN IF NOT EXISTS "useTailwindCdn" BOOLEAN NOT NULL DEFAULT false;
