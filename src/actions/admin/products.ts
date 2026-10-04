"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { storage } from "@/lib/storage";
import { planImageReconcile } from "@/lib/admin/images-reconcile";
import { fieldErrorsFromIssues, type LocalizedMessage } from "@/validators/auth";

export type ProductActionResult = {
  ok: boolean;
  id?: string;
  error?: LocalizedMessage;
  fieldErrors?: Record<string, LocalizedMessage>;
};

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(140),
  slug: z.string().trim().max(90),
  sku: z.string().trim().min(1, "SKU is required.").max(60),
  shortDescription: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
  description: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .transform((v) => (v ? v : null)),
  brand: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null)),
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  price: z.coerce.number("Enter a valid price.").int().min(0),
  compareAtPrice: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .transform((v) => (Number.isFinite(v) ? v : null)),
  costPrice: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .transform((v) => (Number.isFinite(v) ? v : null)),
  stock: z.coerce.number("Enter a valid stock amount.").int().min(0),
  seoTitle: z
    .string()
    .trim()
    .max(70)
    .optional()
    .transform((v) => (v ? v : null)),
  seoDescription: z
    .string()
    .trim()
    .max(180)
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function saveProductAction(
  _prev: ProductActionResult,
  formData: FormData
): Promise<ProductActionResult> {
  await requireStaff();

  const productId = String(formData.get("productId") ?? "");
  const existingId = productId || undefined;

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sku: formData.get("sku"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    brand: formData.get("brand"),
    categoryId: formData.get("categoryId"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    costPrice: formData.get("costPrice"),
    stock: formData.get("stock"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  const data = parsed.data;
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  if (!slug) {
    return {
      ok: false,
      fieldErrors: {
        name: {
          en: "A slug could not be generated from the name.",
          bn: "স্লাগ তৈরি করা যায়নি।",
        },
      },
    };
  }
  const finalSlug = await uniqueSlug(slug, existingId);

  const featured = formData.get("featured") === "on";
  const published = formData.get("published") === "on";
  const status = formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  // Variant rows: JSON array of { id?, name, sku, price, stock }.
  let variantsRaw: {
    id?: string;
    name: string;
    sku: string;
    price: string;
    stock: string;
    attributes?: Record<string, unknown>;
  }[] = [];
  const variantsField = formData.get("variants");
  if (typeof variantsField === "string" && variantsField) {
    try {
      variantsRaw = JSON.parse(variantsField);
    } catch {
      variantsRaw = [];
    }
  }
  const variants = variantsRaw.map((v, i) => ({
    id: typeof v.id === "string" && v.id ? v.id : undefined,
    name: String(v.name ?? "").trim(),
    sku: String(v.sku ?? "").trim(),
    price: z.coerce.number().int().min(0).safeParse(v.price).success
      ? Number(v.price)
      : null,
    stock: z.coerce.number().int().min(0).safeParse(v.stock).success
      ? Number(v.stock)
      : 0,
    sortIndex: i,
    attributes:
      typeof v.attributes === "object" && v.attributes !== null
        ? Object.fromEntries(
            Object.entries(v.attributes)
              .map(([k, val]) => [k.trim(), typeof val === "string" ? val.trim() : ""])
              .filter(([, val]) => val)
          )
        : {},
  }));

  for (const v of variants) {
    if (!v.name) {
      return {
        ok: false,
        fieldErrors: {
          variants: {
            en: "Every variant needs a label (e.g. Size M).",
            bn: "প্রতিটি ভ্যারিয়েন্টের নাম দিন।",
          },
        },
      };
    }
    if (!v.sku || typeof v.price !== "number") {
      return {
        ok: false,
        fieldErrors: {
          variants: {
            en: "Every variant needs a SKU and a valid price.",
            bn: "প্রতিটি ভ্যারিয়েন্টের SKU ও দাম দিন।",
          },
        },
      };
    }
  }

  // Ordered images: [{ id?, url, alt? }]. New uploads arrive as url-only rows.
  let imageList: { id?: string; url: string; alt?: string }[] = [];
  const imagesRaw = formData.get("imageList");
  if (typeof imagesRaw === "string" && imagesRaw) {
    try {
      const parsed = JSON.parse(imagesRaw);
      if (Array.isArray(parsed)) {
        imageList = parsed
          .map((e) => ({
            id: typeof e?.id === "string" && e.id ? e.id : undefined,
            url: typeof e?.url === "string" ? e.url.trim() : "",
            alt: typeof e?.alt === "string" ? e.alt.trim() : "",
          }))
          .filter((e) => e.url.length > 0);
      }
    } catch {
      imageList = [];
    }
  }
  if (imageList.length > 40) {
    return {
      ok: false,
      fieldErrors: {
        newImages: {
          en: "Too many images.",
          bn: "খুব বেশি ছবি।",
        },
      },
    };
  }
  for (const img of imageList) {
    const isRelative = img.url.startsWith("/");
    const isHttp = /^https?:\/\/.+/.test(img.url);
    if (!isRelative && !isHttp) {
      return {
        ok: false,
        fieldErrors: {
          newImages: {
            en: "Every image must have a valid URL.",
            bn: "প্রতিটি ছবির URL সঠিক দিন।",
          },
        },
      };
    }
  }

  const variantSkus = new Set<string>();
  for (const v of variants) {
    if (variantSkus.has(v.sku)) {
      return {
        ok: false,
        fieldErrors: {
          variants: {
            en: `Duplicate variant SKU: ${v.sku}.`,
            bn: "ডুপ্লিকেট ভ্যারিয়েন্ট SKU।",
          },
        },
      };
    }
    variantSkus.add(v.sku);
  }

  const imageFilesToRemove: string[] = [];

  try {
    const product = await prisma.$transaction(async (tx) => {
      const saved = existingId
        ? await tx.product.update({
            where: { id: existingId },
            data: {
              ...data,
              slug: finalSlug,
              featured,
              published,
              status,
            },
          })
        : await tx.product.create({
            data: {
              ...data,
              slug: finalSlug,
              featured,
              published,
              status,
              stock: data.stock,
            },
          });

      // --- images ---
      const existingImages = await tx.productImage.findMany({
        where: { productId: saved.id },
        select: { id: true, url: true },
      });
      const { toDelete, byUrl } = planImageReconcile(existingImages, imageList);
      if (toDelete.length > 0) {
        imageFilesToRemove.push(...toDelete.map((img) => img.url));
        await tx.productImage.deleteMany({
          where: { id: { in: toDelete.map((img) => img.id) } },
        });
      }

      let sortOrder = 0;
      for (const img of imageList) {
        const alt = img.alt || null;
        if (img.id) {
          await tx.productImage.updateMany({
            where: { id: img.id, productId: saved.id },
            data: { sortOrder: sortOrder++, alt },
          });
        } else {
          const existing = byUrl.get(img.url);
          if (existing) {
            await tx.productImage.updateMany({
              where: { id: existing.id, productId: saved.id },
              data: { sortOrder: sortOrder++, alt },
            });
          } else {
            await tx.productImage.create({
              data: { productId: saved.id, url: img.url, sortOrder: sortOrder++, alt },
            });
          }
        }
      }

      // --- variants ---
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: saved.id },
        select: { id: true },
      });
      const variantIds = new Set(variants.map((v) => v.id).filter(Boolean));
      const deleteVariants = existingVariants
        .filter((v) => !variantIds.has(v.id))
        .map((v) => v.id);
      if (deleteVariants.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: deleteVariants } } });
      }
      for (const v of variants) {
        const payload = {
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
        };
        if (v.id) {
          await tx.productVariant.update({ where: { id: v.id }, data: payload });
        } else {
          await tx.productVariant.create({
            data: { ...payload, productId: saved.id },
          });
        }
      }

      return saved;
    });

    revalidatePath("/admin/products");
    revalidatePath(`/product/${finalSlug}`);
    if (imageFilesToRemove.length > 0) {
      await storage.deleteFiles(imageFilesToRemove).catch(() => {});
    }
    void logAudit({
      action: existingId ? "product.update" : "product.create",
      entityType: "product",
      entityId: product.id,
      metadata: { name: data.name, sku: data.sku },
    });
    return { ok: true, id: product.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("slug")) {
        return {
          ok: false,
          fieldErrors: {
            slug: {
              en: "This slug is already in use. Try a different one.",
              bn: "স্লাগটি ব্যবহার হচ্ছে।",
            },
          },
        };
      }
      if (target.includes("sku")) {
        return {
          ok: false,
          fieldErrors: {
            name: { en: "This SKU is already in use.", bn: "SKU ব্যবহার হচ্ছে।" },
          },
        };
      }
    }
    return {
      ok: false,
      error: {
        en: "Failed to save the product. Please try again.",
        bn: "পণ্য সেভ হয়নি। আবার চেষ্টা করুন।",
      },
    };
  }
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  for (;;) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (ignoreId && existing.id === ignoreId)) return candidate;
    candidate = `${base}-${n++}`;
  }
}

export async function setProductPublishedAction(
  id: string,
  published: boolean
): Promise<void> {
  await requireStaff();
  await prisma.product.update({ where: { id }, data: { published } });
  revalidatePath("/admin/products");
}

export async function setProductFeaturedAction(
  id: string,
  featured: boolean
): Promise<void> {
  await requireStaff();
  await prisma.product.update({ where: { id }, data: { featured } });
  revalidatePath("/admin/products");
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireStaff();
  const images = await prisma.productImage.findMany({
    where: { productId: id },
    select: { url: true },
  });
  await prisma.product.delete({ where: { id } });
  if (images.length > 0) {
    await storage.deleteFiles(images.map((img) => img.url)).catch(() => {});
  }
  void logAudit({ action: "product.delete", entityType: "product", entityId: id });
  revalidatePath("/admin/products");
}

export async function duplicateProductAction(id: string): Promise<{ ok: boolean; id?: string }> {
  await requireStaff();

  const source = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
    },
  });
  if (!source) return { ok: false };

  const baseName = `${source.name} (Copy)`;
  const slug = await uniqueSlug(`${source.slug}-copy`);
  let sku = source.sku ? `${source.sku}-copy` : "";
  for (;;) {
    if (!sku) break;
    const taken = await prisma.product.findFirst({ where: { sku }, select: { id: true } });
    if (!taken) break;
    sku = `${source.sku}-copy-${Math.random().toString(36).slice(2, 7)}`;
  }

  const copy = await prisma.product.create({
    data: {
      name: baseName,
      slug,
      sku,
      shortDescription: source.shortDescription,
      description: source.description,
      brand: source.brand,
      categoryId: source.categoryId,
      price: source.price,
      compareAtPrice: source.compareAtPrice,
      costPrice: source.costPrice,
      stock: source.stock,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      featured: false,
      published: false,
      status: "ACTIVE",
      images: {
        create: source.images.map((img) => ({
          url: img.url,
          alt: img.alt,
          sortOrder: img.sortOrder,
        })),
      },
      variants: {
        create: source.variants.map((v) => ({
          name: v.name,
          sku: `${v.sku}-copy`,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes ?? {},
        })),
      },
    },
  });

  revalidatePath("/admin/products");
  void logAudit({
    action: "product.duplicate",
    entityType: "product",
    entityId: copy.id,
    metadata: { sourceId: id, sourceName: source.name },
  });
  return { ok: true, id: copy.id };
}

export async function bulkProductAction(input: {
  ids: string[];
  action: "publish" | "unpublish" | "delete";
}): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  if (input.ids.length === 0) return { ok: false, error: "No products selected." };

  if (input.action === "delete") {
    const images = await prisma.productImage.findMany({
      where: { productId: { in: input.ids } },
      select: { url: true },
    });
    await prisma.product.deleteMany({ where: { id: { in: input.ids } } });
    if (images.length > 0) {
      await storage.deleteFiles(images.map((img) => img.url)).catch(() => {});
    }
  } else {
    await prisma.product.updateMany({
      where: { id: { in: input.ids } },
      data: { published: input.action === "publish" },
    });
  }

  revalidatePath("/admin/products");
  void logAudit({
    action: "product.bulk",
    entityType: "product",
    metadata: { action: input.action, count: input.ids.length },
  });
  return { ok: true };
}
