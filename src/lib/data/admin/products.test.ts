import { describe, expect, it, vi } from "vitest";

// The filter helpers are pure, but the module also imports the Prisma client
// at module scope. Stub it so no connection pool is created during tests.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { parseProductStatus, productStatusWhere } =
  await import("@/lib/data/admin/products");

describe("parseProductStatus (admin product status filter)", () => {
  it("accepts every declared filter value", () => {
    expect(parseProductStatus("ALL")).toBe("ALL");
    expect(parseProductStatus("ACTIVE")).toBe("ACTIVE");
    expect(parseProductStatus("INACTIVE")).toBe("INACTIVE");
    expect(parseProductStatus("UNPUBLISHED")).toBe("UNPUBLISHED");
  });

  it("falls back to ALL for unknown or missing values", () => {
    expect(parseProductStatus("DRAFT")).toBe("ALL");
    expect(parseProductStatus("draft")).toBe("ALL");
    expect(parseProductStatus("garbage")).toBe("ALL");
    expect(parseProductStatus("")).toBe("ALL");
    expect(parseProductStatus(null)).toBe("ALL");
    expect(parseProductStatus(undefined)).toBe("ALL");
  });
});

describe("productStatusWhere (Prisma clause)", () => {
  it("maps status filters to the ProductStatus enum", () => {
    expect(productStatusWhere("ACTIVE")).toEqual({ status: "ACTIVE" });
    expect(productStatusWhere("INACTIVE")).toEqual({ status: "INACTIVE" });
  });

  it("maps UNPUBLISHED to the published flag, not the status enum", () => {
    expect(productStatusWhere("UNPUBLISHED")).toEqual({ published: false });
  });

  it("applies no filter for ALL", () => {
    expect(productStatusWhere("ALL")).toEqual({});
  });

  it("never emits a value outside the ProductStatus enum", () => {
    // Regression: the old query cast an unvalidated searchParam straight to
    // "ACTIVE" | "INACTIVE", so ?status=DRAFT reached Prisma and threw.
    const enumValues = ["ACTIVE", "INACTIVE"];
    for (const raw of ["ALL", "ACTIVE", "INACTIVE", "UNPUBLISHED", "DRAFT", "x"]) {
      const clause = productStatusWhere(parseProductStatus(raw));
      if ("status" in clause) {
        expect(enumValues).toContain(clause.status);
      }
    }
  });
});
