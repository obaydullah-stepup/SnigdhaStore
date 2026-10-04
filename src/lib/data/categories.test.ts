import { describe, expect, it, vi } from "vitest";

type Cat = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  description: string | null;
  image: string | null;
  isActive: boolean;
};

// l1 <-> l2 is a cycle. l1 -> l2 -> l3 is a normal chain.
const categories: Cat[] = [
  {
    id: "l1",
    slug: "loop-one",
    name: "Loop One",
    parentId: "l2",
    description: null,
    image: null,
    isActive: true,
  },
  {
    id: "l2",
    slug: "loop-two",
    name: "Loop Two",
    parentId: "l1",
    description: null,
    image: null,
    isActive: true,
  },
  {
    id: "l3",
    slug: "child",
    name: "Child",
    parentId: "l2",
    description: null,
    image: null,
    isActive: true,
  },
  {
    id: "s1",
    slug: "sarees",
    name: "Sarees",
    parentId: null,
    description: null,
    image: null,
    isActive: true,
  },
  {
    id: "s2",
    slug: "silk",
    name: "Silk",
    parentId: "s1",
    description: null,
    image: null,
    isActive: true,
  },
];

const categoryFindMany = vi.fn(async (args: Record<string, unknown>) => {
  const where = (args.where ?? {}) as { slug?: string };
  if (typeof where.slug === "string") {
    return categories.filter((c) => c.slug === where.slug).map((c) => ({ id: c.id }));
  }
  return categories.map((c) => ({ id: c.id, parentId: c.parentId }));
});

const categoryFindUnique = vi.fn(
  async ({ where }: { where: { slug?: string; id?: string } }) => {
    const found = where.slug
      ? categories.find((c) => c.slug === where.slug)
      : categories.find((c) => c.id === where.id);
    return found ? { ...found, children: [] } : null;
  }
);

// Captures the `where` handed to the product query so we can inspect the ids.
let capturedIds: string[] = [];
const productFindMany = vi.fn(async (args: Record<string, unknown>) => {
  const where = (args.where ?? {}) as { categoryId?: { in?: string[] } };
  capturedIds = where.categoryId?.in ?? [];
  return [];
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: categoryFindMany, findUnique: categoryFindUnique },
    product: {
      count: vi.fn(async () => 0),
      findMany: productFindMany,
    },
    $transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : arg
    ),
  },
}));

const { getCategoryBySlug } = await import("@/lib/data/categories");
const { getProductSummaries } = await import("@/lib/data/products");

describe("getCategoryBySlug (ancestor walk)", () => {
  it("resolves for a normal chain, root first", async () => {
    const detail = await getCategoryBySlug("silk");
    expect(detail?.breadcrumb.map((b) => b.slug)).toEqual(["sarees", "silk"]);
  });

  it("resolves rather than hanging when the category sits in a cycle", async () => {
    // Regression: the old `while (parentId)` loop never terminated on a cycle
    // and hung the request. Resolution is the assertion.
    const detail = await getCategoryBySlug("loop-one");
    expect(detail).not.toBeNull();
  }, 5000);

  it("never repeats a category in the breadcrumb", async () => {
    const detail = await getCategoryBySlug("loop-one");
    const slugs = detail!.breadcrumb.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  }, 5000);
});

describe("getProductSummaries (descendant walk)", () => {
  it("resolves rather than hanging when descendants form a cycle", async () => {
    await getProductSummaries({ categorySlug: "loop-one" });
    expect(true).toBe(true);
  }, 5000);

  it("includes each descendant exactly once", async () => {
    await getProductSummaries({ categorySlug: "loop-one" });
    expect(capturedIds.length).toBeGreaterThan(0);
    expect(new Set(capturedIds).size).toBe(capturedIds.length);
  }, 5000);

  it("collects the full subtree for a normal chain", async () => {
    await getProductSummaries({ categorySlug: "sarees" });
    expect(new Set(capturedIds)).toEqual(new Set(["s1", "s2"]));
  });
});
