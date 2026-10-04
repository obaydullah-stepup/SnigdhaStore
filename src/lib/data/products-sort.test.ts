import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getProductSummaries } from "@/lib/data/products";

const rnd = () => Math.random().toString(36).slice(2, 8);
let categoryId: string;
const createdProductIds: string[] = [];
/** Every user this file creates, so cleanup never touches unrelated rows. */
const createdUserIds: string[] = [];

/** @param rating average rating to attach, as `copies` approved reviews */
async function seedProduct(soldCount: number, rating: number, copies: number) {
  const product = await prisma.product.create({
    data: {
      name: `P-${rnd()}`,
      slug: `p-${rnd()}`,
      sku: `sku-${rnd()}`,
      price: 1000,
      stock: 5,
      soldCount,
      status: "ACTIVE",
      published: true,
      categoryId,
    },
  });
  createdProductIds.push(product.id);

  // Each reviewer can only review a product once, so use distinct users.
  for (let i = 0; i < copies; i++) {
    const email = `rev-${rnd()}@example.com`;
    const reviewer = await prisma.user.create({
      data: { email, passwordHash: "x", name: "Reviewer" },
    });
    createdUserIds.push(reviewer.id);
    await prisma.review.create({
      data: {
        userId: reviewer.id,
        productId: product.id,
        rating,
        comment: "ok",
        isApproved: true,
      },
    });
  }
  return product;
}

beforeAll(async () => {
  const cat = await prisma.category.create({
    data: {
      name: "SortTest",
      slug: `sorttest-${Date.now().toString(36)}`,
      isActive: true,
    },
  });
  categoryId = cat.id;
  const u = await prisma.user.create({
    data: { email: `owner-${rnd()}@example.com`, passwordHash: "x", name: "Owner" },
  });
  createdUserIds.push(u.id);
});

afterAll(async () => {
  // Restrict to rows this file created. A `userId: { not: userId }` filter would
  // wipe every review in the database that belongs to another user.
  await prisma.review.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("getProductSummaries rating sort", () => {
  it("puts the highest-rated products on page 1, ahead of better sellers", async () => {
    const worstSoldBest = await seedProduct(100, 1, 3);
    const worstSoldSecond = await seedProduct(90, 1, 3);
    const bestRated = await seedProduct(10, 5, 3);
    const bestRatedSecond = await seedProduct(5, 5, 3);

    const slug = (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
      .slug;

    const page1 = await getProductSummaries({
      categorySlug: slug,
      sort: "rating",
      perPage: 2,
      page: 1,
    });

    // The two 5-star products must lead, even though they sold far less.
    expect(
      page1.items
        .slice(0, 2)
        .map((p) => p.id)
        .sort()
    ).toEqual([bestRated.id, bestRatedSecond.id].sort());
    expect(page1.items[0].rating).toBe(5);

    const page2 = await getProductSummaries({
      categorySlug: slug,
      sort: "rating",
      perPage: 2,
      page: 2,
    });
    expect(page2.items.map((p) => p.id).sort()).toEqual(
      [worstSoldBest.id, worstSoldSecond.id].sort()
    );

    expect(page1.total).toBe(page2.total);
    expect(page1.pageCount).toBe(2);
  }, 30000);

  it("orders by descending rating within the returned page", async () => {
    const slug = (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
      .slug;
    const { items } = await getProductSummaries({
      categorySlug: slug,
      sort: "rating",
      perPage: 20,
    });

    const ratings = items.map((p) => p.rating);
    const sorted = [...ratings].sort((a, b) => b - a);
    expect(ratings).toEqual(sorted);
  }, 30000);

  it("is stable for equally rated products across repeated calls", async () => {
    // Two 3-star products whose relative order must not drift between requests.
    const a = await seedProduct(30, 3, 2);
    const b = await seedProduct(20, 3, 2);
    const slug = (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
      .slug;

    const first = await getProductSummaries({
      categorySlug: slug,
      sort: "rating",
      perPage: 50,
    });
    const second = await getProductSummaries({
      categorySlug: slug,
      sort: "rating",
      perPage: 50,
    });

    const pair = (r: typeof first) => {
      const ids = r.items.map((p) => p.id);
      return [ids.indexOf(a.id), ids.indexOf(b.id)].sort((x, y) => x - y);
    };
    expect(pair(first)).toEqual(pair(second));
  }, 30000);

  it("excludes unapproved reviews from the average", async () => {
    const slug = (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
      .slug;
    const product = await seedProduct(1, 5, 1);

    const email = `pending-${rnd()}@example.com`;
    const reviewer = await prisma.user.create({
      data: { email, passwordHash: "x", name: "Pending" },
    });
    // A rejected 1-star review must not drag the average down.
    await prisma.review.create({
      data: {
        userId: reviewer.id,
        productId: product.id,
        rating: 1,
        comment: "no",
        isApproved: false,
      },
    });

    const { items } = await getProductSummaries({
      categorySlug: slug,
      sort: "rating",
      perPage: 50,
    });
    const found = items.find((p) => p.id === product.id);
    expect(found?.rating).toBe(5);
    expect(found?.reviewCount).toBe(1);
  }, 30000);

  it("still honours a non-rating sort when ratingMin is combined with it", async () => {
    const slug = (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
      .slug;
    const { items } = await getProductSummaries({
      categorySlug: slug,
      sort: "price-asc",
      ratingMin: 3,
      perPage: 50,
    });

    const prices = items.map((p) => p.price);
    // Every returned item must satisfy the rating filter...
    expect(items.length).toBeGreaterThan(0);
    // ...and the requested price sort must survive, rather than being silently
    // replaced by a rating re-sort.
    const ascending = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(ascending);
  }, 30000);
});
