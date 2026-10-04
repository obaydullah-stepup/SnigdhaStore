import "server-only";
import { prisma } from "@/lib/prisma";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
};

/**
 * The chain of nodes reached by following `parentId` up from `startId`,
 * starting with `startId` itself and ending at the root.
 *
 * The `seen` set is load-bearing: category parent links are not constrained
 * against cycles in the database, so without it a cycle makes this loop walk
 * forever and hang the request. Break on revisit instead.
 */
export async function collectParentChain(
  startId: string | null
): Promise<CategoryNode[]> {
  const chain: CategoryNode[] = [];
  const seen = new Set<string>();
  let currentId = startId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const node = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, slug: true, name: true, parentId: true },
    });
    if (!node) break;
    chain.push(node);
    currentId = node.parentId;
  }

  return chain;
}

/** True when `id` appears in a chain, i.e. it is an ancestor of the chain's start. */
export function chainIncludes(chain: CategoryNode[], id: string): boolean {
  return chain.some((node) => node.id === id);
}
