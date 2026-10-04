import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductSort =
  "newest" | "price-asc" | "price-desc" | "best-selling" | "rating" | "name-asc";

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  soldCount: number;
  featured: boolean;
  brand: string | null;
  image: string | null;
  imageAlt: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  rating: number;
  reviewCount: number;
  createdAt: Date;
};

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  soldCount: true,
  featured: true,
  brand: true,
  createdAt: true,
  images: {
    select: { url: true, alt: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
  category: { select: { slug: true, name: true } },
  reviews: {
    where: { isApproved: true },
    select: { rating: true },
  },
} satisfies Prisma.ProductSelect;

type SummaryRow = Prisma.ProductGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow): ProductSummary {
  const count = row.reviews.length;
  const rating =
    count === 0 ? 0 : row.reviews.reduce((sum, r) => sum + r.rating, 0) / count;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    stock: row.stock,
    soldCount: row.soldCount,
    featured: row.featured,
    brand: row.brand,
    image: row.images[0]?.url ?? null,
    imageAlt: row.images[0]?.alt ?? row.name,
    categorySlug: row.category?.slug ?? null,
    categoryName: row.category?.name ?? null,
    rating,
    reviewCount: count,
    createdAt: row.createdAt,
  };
}

export type ProductQuery = {
  q?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  stockOnly?: boolean;
  ratingMin?: number;
  featuredOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  excludeSlugs?: string[];
};

const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  "best-selling": { soldCount: "desc" },
  rating: { soldCount: "desc" },
  "name-asc": { name: "asc" },
};

async function resolveCategoryIds(slug: string): Promise<string[]> {
  const matches = await prisma.category.findMany({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (matches.length === 0) return [];
  const rootId = matches[0].id;

  const all = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });
  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    if (c.parentId) {
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c.id);
      childrenByParent.set(c.parentId, list);
    }
  }
  const ids = [rootId];
  const stack = [rootId];
  // `seen` keeps a parent cycle from expanding forever and from listing the
  // same category twice.
  const seen = new Set<string>([rootId]);
  while (stack.length > 0) {
    const parent = stack.pop()!;
    const kids = childrenByParent.get(parent) ?? [];
    for (const k of kids) {
      if (seen.has(k)) continue;
      seen.add(k);
      ids.push(k);
      stack.push(k);
    }
  }
  return ids;
}

async function idsWithRatingAtLeast(min: number): Promise<string[]> {
  const groups = await prisma.review.groupBy({
    by: ["productId"],
    where: { isApproved: true },
    _avg: { rating: true },
  });
  return groups
    .filter((g) => (g._avg.rating ?? 0) >= min)
    .sort((a, b) => (b._avg.rating ?? 0) - (a._avg.rating ?? 0))
    .map((g) => g.productId);
}

export async function getProductSummaries(
  query: ProductQuery = {}
): Promise<{ items: ProductSummary[]; total: number; pageCount: number }> {
  const {
    q,
    categorySlug,
    minPrice,
    maxPrice,
    stockOnly,
    ratingMin,
    featuredOnly,
    sort = "newest",
    page = 1,
    perPage = 12,
    excludeSlugs,
  } = query;

  const where: Prisma.ProductWhereInput = {
    published: true,
    status: "ACTIVE",
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  if (categorySlug) {
    const ids = await resolveCategoryIds(categorySlug);
    if (ids.length === 0) return { items: [], total: 0, pageCount: 0 };
    where.categoryId = { in: ids };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (stockOnly) {
    where.stock = { gt: 0 };
  }

  if (featuredOnly) {
    where.featured = true;
  }

  if (excludeSlugs && excludeSlugs.length > 0) {
    where.slug = { notIn: excludeSlugs };
  }

  if (ratingMin) {
    const ratingIds = await idsWithRatingAtLeast(ratingMin);
    if (ratingIds.length === 0) return { items: [], total: 0, pageCount: 0 };
    where.id = { in: ratingIds };
  }

  if (sort === "rating") {
    // Rating is an aggregate over reviews, which Prisma cannot express in a
    // SQL orderBy, so the ranking has to be built here. It must be built
    // *before* pagination: the previous version let the database apply
    // skip/take first (by soldCount, per ORDER_BY) and then re-sorted only
    // that page, so "top rated" really paginated the best-selling products and
    // the genuinely highest-rated ones could land on any later page.
    const ranked = await prisma.product.findMany({
      where,
      select: {
        id: true,
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
    });

    const avgOf = (reviews: { rating: number }[]) =>
      reviews.length === 0
        ? 0
        : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    ranked.sort((a, b) => {
      const diff = avgOf(b.reviews) - avgOf(a.reviews);
      // Tie-break on id so equally rated products keep the same order on every
      // request instead of drifting between pages.
      if (diff !== 0) return diff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    const total = ranked.length;
    const offset = (page - 1) * perPage;
    const pageIds = ranked.slice(offset, offset + perPage).map((p) => p.id);

    const pageRows = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: summarySelect,
    });
    const byId = new Map(pageRows.map((row) => [row.id, toSummary(row)]));

    return {
      items: pageIds
        .map((id) => byId.get(id))
        .filter((summary): summary is ProductSummary => summary !== undefined),
      total,
      pageCount: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: summarySelect,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  // No rating re-sort here: the rating branch above returns early with its own
  // ranking. Re-sorting a page by rating would override whichever sort the
  // visitor actually asked for whenever `ratingMin` was combined with it.
  return {
    items: rows.map(toSummary),
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductSummariesBySlugs(
  slugs: string[]
): Promise<ProductSummary[]> {
  if (slugs.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: {
      slug: { in: slugs },
      published: true,
      status: "ACTIVE",
    },
    select: summarySelect,
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((r): r is SummaryRow => Boolean(r))
    .map(toSummary);
}

export type ProductDetail = Prisma.ProductGetPayload<{
  include: {
    images: { orderBy: { sortOrder: "asc" } };
    variants: true;
    category: { include: { parent: true } };
  };
}>;

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return prisma.product.findFirst({
    where: { slug, published: true, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      category: { include: { parent: true } },
    },
  });
}

export async function getRelatedProducts(
  slug: string,
  categoryId: string | null,
  limit = 4
): Promise<ProductSummary[]> {
  const where: Prisma.ProductWhereInput = {
    slug: { not: slug },
    published: true,
    status: "ACTIVE",
  };
  if (categoryId) where.categoryId = categoryId;

  const rows = await prisma.product.findMany({
    where,
    select: summarySelect,
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  if (rows.length > 0 || categoryId == null) return rows.map(toSummary);

  const fallback = await prisma.product.findMany({
    where: { slug: { not: slug }, published: true, status: "ACTIVE" },
    select: summarySelect,
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  return fallback.map(toSummary);
}
