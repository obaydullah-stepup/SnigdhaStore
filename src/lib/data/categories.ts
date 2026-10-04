import "server-only";
import { prisma } from "@/lib/prisma";
import { collectParentChain } from "@/lib/category-tree";

export type CategoryCard = {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  productCount: number;
};

export async function getActiveCategories(): Promise<CategoryCard[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      name: true,
      description: true,
      image: true,
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    image: r.image,
    productCount: r._count.products,
  }));
}

export type CategoryDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  breadcrumb: { slug: string; name: string }[];
  children: { slug: string; name: string; productCount: number }[];
};

export async function getCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        where: { isActive: true },
        select: {
          slug: true,
          name: true,
          _count: { select: { products: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!category) return null;

  const breadcrumb = [{ slug: category.slug, name: category.name }];
  const seen = new Set<string>([category.id]);
  for (const parent of await collectParentChain(category.parentId)) {
    // Stop at a repeat rather than rendering the same category twice.
    if (seen.has(parent.id)) break;
    seen.add(parent.id);
    breadcrumb.unshift({ slug: parent.slug, name: parent.name });
  }

  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    image: category.image,
    breadcrumb,
    children: category.children.map((c) => ({
      slug: c.slug,
      name: c.name,
      productCount: c._count.products,
    })),
  };
}
