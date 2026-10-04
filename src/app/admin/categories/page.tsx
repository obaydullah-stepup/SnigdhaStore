import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { CategoryForm } from "@/components/admin/category-form";
import { CategoryRowActions } from "@/components/admin/category-row-actions";

export const metadata = { title: "Categories" };

type FlatCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId: string | null;
  sortOrder: number;
  _count: { products: number };
};

function buildTree(rows: FlatCategory[]): { id: string; name: string; depth: number }[] {
  const byParent = new Map<string | null, FlatCategory[]>();
  for (const r of rows) {
    const list = byParent.get(r.parentId) ?? [];
    list.push(r);
    byParent.set(r.parentId, list);
  }
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const r of (byParent.get(parentId) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder
    )) {
      out.push({ id: r.id, name: r.name, depth });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const editingId = sp.edit;

  const [rows, editing] = await Promise.all([
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    }) as Promise<FlatCategory[]>,
    editingId
      ? prisma.category.findUnique({ where: { id: editingId } })
      : Promise.resolve(null),
  ]);
  if (editingId && !editing) notFound();

  const tree = buildTree(rows);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs
          items={[{ label: "Admin", href: "/admin" }, { label: "Categories" }]}
        />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Categories
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="border-border bg-card self-start rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            {editing ? `Edit — ${editing.name}` : "Add category"}
          </h2>
          <div className="mt-4">
            <CategoryForm
              key={editing?.id ?? "new"}
              categories={tree}
              initial={
                editing
                  ? {
                      id: editing.id,
                      name: editing.name,
                      slug: editing.slug,
                      description: editing.description,
                      image: editing.image,
                      parentId: editing.parentId,
                      sortOrder: editing.sortOrder,
                    }
                  : undefined
              }
            />
          </div>
        </div>

        <div className="border-border bg-card overflow-hidden rounded-xl border">
          {rows.length === 0 ? (
            <p className="text-muted-foreground flex items-center justify-center p-10 text-sm">
              No categories yet. Use the form to add your first category.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="p-3 font-medium">Name</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Slug</th>
                  <th className="p-3 text-right font-medium">Products</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tree.map((c) => {
                  const row = rows.find((r) => r.id === c.id);
                  if (!row) return null;
                  return (
                    <tr key={c.id} className="border-border/60 border-t">
                      <td className="p-3">
                        <span className="font-medium">
                          {"\u00A0".repeat(0)}
                          {c.name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {c.depth > 0
                            ? `Parent: ${tree.find((t) => t.id === row.parentId)?.name ?? "—"}`
                            : "Top level"}
                          {!row.isActive && (
                            <span className="text-destructive ml-2"> (hidden)</span>
                          )}
                        </span>
                      </td>
                      <td className="text-muted-foreground hidden p-3 sm:table-cell">
                        {row.slug}
                      </td>
                      <td className="p-3 text-right">{row._count.products}</td>
                      <td className="p-3">
                        <CategoryRowActions
                          id={c.id}
                          checked={row.isActive}
                          checkedLabel="Active"
                          editHref={`/admin/categories?edit=${c.id}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
