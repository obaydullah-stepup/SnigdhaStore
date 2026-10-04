"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { collectParentChain, chainIncludes } from "@/lib/category-tree";
import { storage } from "@/lib/storage";
import { redirect } from "next/navigation";

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required.").max(80),
  slug: z.string().trim().max(90),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  image: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  parentId: z
    .union([z.string(), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CategoryFormState = { ok: boolean; error?: string; message?: string };

export async function saveCategoryAction(
  prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requireStaff();
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    image: formData.get("image"),
    parentId: formData.get("parentId"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const slug = data.slug.trim() ? slugify(data.slug) : slugify(data.name);
  const categoryId = data.id;

  try {
    if (categoryId) {
      const existing = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!existing) return { ok: false, error: "Category not found." };
      if (data.parentId === categoryId)
        return { ok: false, error: "A category cannot be its own parent." };
      // Reject an indirect loop too: making an ancestor of this category its
      // parent would leave the tree with no root, and every ancestor walk
      // would then spin forever.
      if (
        data.parentId &&
        chainIncludes(await collectParentChain(data.parentId), categoryId)
      ) {
        return { ok: false, error: "That parent would create a category loop." };
      }
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          name: data.name,
          slug,
          description: data.description,
          image: data.image,
          parentId: data.parentId,
          sortOrder: data.sortOrder,
        },
      });
      if (existing.image && existing.image !== data.image) {
        await storage.deleteFiles([existing.image]).catch(() => {});
      }
    } else {
      await prisma.category.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          image: data.image,
          parentId: data.parentId,
          sortOrder: data.sortOrder,
        },
      });
    }
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false, error: `Slug "${slug}" is already in use.` };
    }
    return { ok: false, error: "Failed to save category." };
  }

  revalidatePath("/admin/categories");
  void logAudit({
    action: categoryId ? "category.update" : "category.create",
    entityType: "category",
    metadata: { name: data.name, slug },
  });
  if (categoryId) redirect(`/admin/categories`);
  return { ok: true };
}

export async function toggleCategoryActiveAction(
  id: string,
  isActive: boolean
): Promise<{ ok: boolean }> {
  await requireStaff();
  await prisma.category.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategoryAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return { ok: false, error: "Move or delete products in this category first." };
  }
  await prisma.category.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });
  const removed = await prisma.category.delete({ where: { id } });
  if (removed.image) {
    await storage.deleteFiles([removed.image]).catch(() => {});
  }
  void logAudit({
    action: "category.delete",
    entityType: "category",
    entityId: id,
    metadata: { name: removed.name },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}
