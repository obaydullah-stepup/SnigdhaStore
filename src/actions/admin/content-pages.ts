"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { DEFAULT_PAGES } from "@/lib/content-page";
import { resolveBrand } from "@/config/site";
import { getCachedStoreName } from "@/lib/settings";
import {
  contentPageSchema,
  toContentPageData,
  type ContentPageFormState,
} from "@/validators/content-page";

export type { ContentPageFormState };

const formValue = (formData: FormData, key: string): FormDataEntryValue | null =>
  formData.get(key);

/**
 * Landing pages render author-supplied HTML/CSS/JS on an unauthenticated public
 * URL, so they are restricted to SUPER_ADMIN. Text pages stay at ADMIN.
 */
async function authorizePageType(type: string) {
  if (type === "LANDING") return requireRole("SUPER_ADMIN");
  return requireAdmin();
}

export async function createContentPageAction(
  _prev: ContentPageFormState,
  formData: FormData
): Promise<ContentPageFormState> {
  const rawType = formValue(formData, "type");
  await authorizePageType(rawType === "LANDING" ? "LANDING" : "TEXT");

  const parsed = contentPageSchema.safeParse({
    type: rawType,
    slug: formValue(formData, "slug"),
    title: formValue(formData, "title"),
    content: formValue(formData, "content"),
    html: formValue(formData, "html"),
    css: formValue(formData, "css"),
    js: formValue(formData, "js"),
    useTailwindCdn: formValue(formData, "useTailwindCdn") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page data." };
  }

  const data = toContentPageData(parsed.data);

  const existing = await prisma.contentPage.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "A page with this slug already exists." };

  await prisma.contentPage.create({ data });
  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${data.slug}`);
  void logAudit({
    action: "page.create",
    entityType: "content_page",
    metadata: { slug: data.slug, title: data.title, type: data.type },
  });
  return { ok: true };
}

export async function updateContentPageAction(
  id: string,
  _prev: ContentPageFormState,
  formData: FormData
): Promise<ContentPageFormState> {
  const rawType = formValue(formData, "type");
  await authorizePageType(rawType === "LANDING" ? "LANDING" : "TEXT");

  const parsed = contentPageSchema.safeParse({
    type: rawType,
    slug: formValue(formData, "slug"),
    title: formValue(formData, "title"),
    content: formValue(formData, "content"),
    html: formValue(formData, "html"),
    css: formValue(formData, "css"),
    js: formValue(formData, "js"),
    useTailwindCdn: formValue(formData, "useTailwindCdn") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page data." };
  }

  const data = toContentPageData(parsed.data);

  const existing = await prisma.contentPage.findFirst({
    where: { slug: data.slug, NOT: { id } },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "A page with this slug already exists." };

  await prisma.contentPage.update({ where: { id }, data });
  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${data.slug}`);
  void logAudit({
    action: "page.update",
    entityType: "content_page",
    entityId: id,
    metadata: { slug: data.slug, title: data.title, type: data.type },
  });
  return { ok: true };
}

export async function deleteContentPageAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const page = await prisma.contentPage.findUnique({
    where: { id },
    select: { slug: true, type: true },
  });
  await prisma.contentPage.delete({ where: { id } });
  revalidatePath("/admin/pages");
  if (page) revalidatePath(`/pages/${page.slug}`);
  void logAudit({
    action: "page.delete",
    entityType: "content_page",
    entityId: id,
    metadata: { slug: page?.slug, type: page?.type },
  });
  return { ok: true };
}

export async function createDefaultPagesAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  await requireAdmin();
  const [existing, storeName] = await Promise.all([
    prisma.contentPage.findMany({ select: { slug: true } }),
    getCachedStoreName(),
  ]);
  const current = new Set(existing.map((p) => p.slug));

  let created = 0;
  for (const page of DEFAULT_PAGES) {
    if (current.has(page.slug)) continue;
    await prisma.contentPage.create({
      data: {
        slug: page.slug,
        title: resolveBrand(page.title, storeName),
        content: resolveBrand(page.content, storeName),
        type: "TEXT",
        useTailwindCdn: false,
      },
    });
    created++;
  }
  revalidatePath("/admin/pages");
  return {
    ok: true,
    error: created === 0 ? "All default pages already exist." : undefined,
  };
}
