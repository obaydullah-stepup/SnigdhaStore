import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const PRODUCT_SORT_OPTIONS = [
  "newest",
  "oldest",
  "name",
  "price",
  "stock",
] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export function parseProductSort(raw?: string | null): ProductSort {
  return (PRODUCT_SORT_OPTIONS as readonly string[]).includes(raw ?? "")
    ? (raw as ProductSort)
    : "newest";
}

export const PRODUCT_STATUS_FILTERS = [
  "ALL",
  "ACTIVE",
  "INACTIVE",
  "UNPUBLISHED",
] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number];

export function parseProductStatus(raw?: string | null): ProductStatusFilter {
  return (PRODUCT_STATUS_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as ProductStatusFilter)
    : "ALL";
}

export function productStatusWhere(
  filter: ProductStatusFilter
): Prisma.ProductWhereInput {
  switch (filter) {
    case "ACTIVE":
    case "INACTIVE":
      return { status: filter };
    case "UNPUBLISHED":
      return { published: false };
    default:
      return {};
  }
}

export function parsePage(raw?: string | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function getAdminCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, parentId: true },
  });
}

export async function getAdminProductList(params: {
  q?: string;
  status?: string;
  category?: string;
  sort?: ProductSort;
  page: number;
  perPage?: number;
}) {
  const { q, sort, page, category } = params;
  const perPage = params.perPage ?? 15;
  const statusFilter = parseProductStatus(params.status);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { sku: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      productStatusWhere(statusFilter),
      category ? { category: { slug: category } } : {},
    ],
  };

  const orderBy =
    sort === "name"
      ? { name: "asc" as const }
      : sort === "price"
        ? { price: "desc" as const }
        : sort === "stock"
          ? { stock: "asc" as const }
          : sort === "oldest"
            ? { createdAt: "asc" as const }
            : { createdAt: "desc" as const };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        featured: true,
        published: true,
        status: true,
        createdAt: true,
        category: { select: { name: true } },
        images: { select: { url: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      category: { select: { id: true, name: true } },
    },
  });
}
