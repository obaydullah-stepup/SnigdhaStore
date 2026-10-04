import { describe, expect, it, vi } from "vitest";

// Parent links. a -> null, b -> a, c -> b is a normal chain;
// loop1 <-> loop2 and self are cycles that must not be walked forever.
const graph: Record<
  string,
  { id: string; slug: string; name: string; parentId: string | null }
> = {
  a: { id: "a", slug: "a", name: "A", parentId: null },
  b: { id: "b", slug: "b", name: "B", parentId: "a" },
  c: { id: "c", slug: "c", name: "C", parentId: "b" },
  loop1: { id: "loop1", slug: "l1", name: "L1", parentId: "loop2" },
  loop2: { id: "loop2", slug: "l2", name: "L2", parentId: "loop1" },
  self: { id: "self", slug: "s", name: "S", parentId: "self" },
};

const findUnique = vi.fn(async ({ where }: { where: { id: string } }) => {
  return graph[where.id] ?? null;
});

vi.mock("@/lib/prisma", () => ({
  prisma: { category: { findUnique } },
}));

const { collectParentChain, chainIncludes } = await import("@/lib/category-tree");

describe("collectParentChain", () => {
  it("walks a normal chain from the start node to the root", async () => {
    const chain = await collectParentChain("c");
    expect(chain.map((n) => n.id)).toEqual(["c", "b", "a"]);
  });

  it("returns an empty chain for nullish input", async () => {
    expect(await collectParentChain(null)).toEqual([]);
  });

  it("returns just the root for a root category", async () => {
    expect((await collectParentChain("a")).map((n) => n.id)).toEqual(["a"]);
  });

  it("stops on a two-node cycle instead of looping forever", async () => {
    // Regression: the old `while (parentId)` loop never terminated here and
    // hung the request. The call resolving at all is the assertion.
    const chain = await collectParentChain("loop1");
    expect(chain.map((n) => n.id)).toEqual(["loop1", "loop2"]);
  }, 5000);

  it("stops on a self-referencing parent", async () => {
    expect((await collectParentChain("self")).map((n) => n.id)).toEqual(["self"]);
  }, 5000);

  it("stops when a parent id points at a missing row", async () => {
    expect(await collectParentChain("does-not-exist")).toEqual([]);
  });

  it("issues one query per level and does not re-query a revisited node", async () => {
    findUnique.mockClear();
    await collectParentChain("loop1");
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});

describe("chainIncludes", () => {
  it("detects a direct parent", async () => {
    expect(chainIncludes(await collectParentChain("c"), "b")).toBe(true);
  });

  it("detects a transitive ancestor, the loop being rejected at write time", async () => {
    expect(chainIncludes(await collectParentChain("c"), "a")).toBe(true);
  });

  it("does not flag unrelated categories", async () => {
    expect(chainIncludes(await collectParentChain("c"), "loop1")).toBe(false);
    expect(chainIncludes([], "a")).toBe(false);
  });
});
