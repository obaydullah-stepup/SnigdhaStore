"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { saveProductAction } from "@/actions/admin/products";
import { createProductImageUploadAction } from "@/actions/admin/upload";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload";
import { SeoEditor } from "@/components/admin/seo-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ImageRow = { id?: string; url: string; alt: string };
type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  attributes?: Record<string, string>;
};

const emptyVariant = (): VariantRow => ({ name: "", sku: "", price: "", stock: "" });

export function ProductForm({
  productId,
  initial,
  categories,
  siteName,
  urlSuffix,
}: {
  productId?: string;
  initial?: {
    name: string;
    slug: string;
    sku: string;
    shortDescription: string | null;
    description: string | null;
    brand: string | null;
    categoryId: string | null;
    price: number;
    compareAtPrice: number | null;
    costPrice: number | null;
    stock: number;
    featured: boolean;
    published: boolean;
    status: "ACTIVE" | "INACTIVE";
    seoTitle: string | null;
    seoDescription: string | null;
    images: { id: string; url: string; alt?: string | null }[];
    variants: {
      id: string;
      name: string;
      sku: string;
      price: number | null;
      stock: number;
      attributes?: Record<string, string>;
    }[];
  };
  categories: { id: string; name: string }[];
  siteName: string;
  urlSuffix: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(saveProductAction, { ok: false });

  const [images, setImages] = useState<ImageRow[]>(
    initial?.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? "" })) ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price?.toString() ?? "",
      stock: v.stock.toString(),
      attributes: v.attributes ?? {},
    })) ?? [emptyVariant()]
  );

  useEffect(() => {
    if (state.ok && state.id) {
      toast.success(productId ? "Product updated." : "Product created.");
      router.replace(`/admin/products/${state.id}`);
    }
  }, [state, router, productId]);

  function moveImage(index: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error(
          `Unsupported file type: ${file.type}. Use JPG, PNG, WebP, AVIF or GIF.`
        );
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Images must be 5 MB or smaller.");
        continue;
      }
      setUploading(true);
      try {
        const ticket = await createProductImageUploadAction({
          filename: file.name,
          mime: file.type,
          folder: "products",
        });
        if (!ticket.ok || !ticket.uploadUrl || !ticket.publicUrl) {
          toast.error(ticket.fieldErrors?.newImages?.en ?? "Upload failed.");
          continue;
        }
        const res = await fetch(ticket.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!res.ok) {
          toast.error("Upload failed. Please try again.");
          continue;
        }
        setImages((prev) => [...prev, { url: ticket.publicUrl!, alt: "" }]);
      } catch {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  }

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  const imageList = JSON.stringify(
    images.map((img) => ({ id: img.id ?? null, url: img.url, alt: img.alt }))
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {productId && <input type="hidden" name="productId" value={productId} />}

      {state.error && (
        <p className="text-destructive rounded-md bg-red-50 p-3 text-sm" role="alert">
          {state.error.en}
        </p>
      )}

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          General
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initial?.name}
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-xs">{state.fieldErrors.name.en}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={initial?.slug}
              placeholder="auto from name"
              aria-invalid={!!state.fieldErrors?.slug}
            />
            {state.fieldErrors?.slug && (
              <p className="text-destructive text-xs">{state.fieldErrors.slug.en}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={initial?.sku}
              aria-invalid={!!state.fieldErrors?.sku}
            />
            {state.fieldErrors?.sku && (
              <p className="text-destructive text-xs">{state.fieldErrors.sku.en}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={initial?.categoryId ?? ""}>
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (BDT)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              defaultValue={initial?.price ?? 0}
              aria-invalid={!!state.fieldErrors?.price}
            />
            {state.fieldErrors?.price && (
              <p className="text-destructive text-xs">{state.fieldErrors.price.en}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compareAtPrice">Compare-at price (BDT)</Label>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              min={0}
              defaultValue={initial?.compareAtPrice ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costPrice">Cost price (BDT)</Label>
            <Input
              id="costPrice"
              name="costPrice"
              type="number"
              min={0}
              defaultValue={initial?.costPrice ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min={0}
              defaultValue={initial?.stock ?? 0}
              aria-invalid={!!state.fieldErrors?.stock}
            />
            {state.fieldErrors?.stock && (
              <p className="text-destructive text-xs">{state.fieldErrors.stock.en}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={initial?.status ?? "ACTIVE"}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={initial?.shortDescription ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={initial?.description ?? ""}
            />
          </div>
          <div className="flex gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="featured"
                className="size-4"
                defaultChecked={initial?.featured}
              />
              Featured on home
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="published"
                className="size-4"
                defaultChecked={initial?.published ?? true}
              />
              Published (visible in shop)
            </label>
          </div>
        </div>
      </section>

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Images
        </h2>
        <input type="hidden" name="imageList" value={imageList} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.id ?? `${img.url}-${i}`}
              className="border-border bg-muted relative overflow-hidden rounded-lg border"
            >
              <div className="relative aspect-square">
                <Image src={img.url} alt={img.alt || ""} fill sizes="200px" className="object-cover" />
                <span className="text-muted-foreground absolute bottom-1 left-1 rounded bg-white/70 px-1 text-[10px]">
                  {i + 1}
                </span>
                <span className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    className="bg-background/80 hover:bg-background rounded p-1"
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === images.length - 1}
                    className="bg-background/80 hover:bg-background rounded p-1"
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="bg-destructive text-destructive-foreground rounded p-1"
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              </div>
              <input
                type="text"
                value={img.alt}
                onChange={(e) =>
                  setImages((prev) =>
                    prev.map((p, idx) =>
                      idx === i ? { ...p, alt: e.target.value } : p
                    )
                  )
                }
                placeholder="Alt text (for SEO)"
                className="w-full border-0 border-t bg-transparent px-2 py-1.5 text-xs focus:ring-0"
              />
            </div>
          ))}
          <label className="border-border text-muted-foreground hover:bg-muted flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs">
            {uploading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-5" aria-hidden="true" />
            )}
            Upload images
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="sr-only"
              onChange={handleFiles}
              disabled={uploading}
            />
          </label>
        </div>
        {state.fieldErrors?.newImages && (
          <p className="text-destructive mt-2 text-xs">
            {state.fieldErrors.newImages.en}
          </p>
        )}
        <p className="text-muted-foreground mt-2 text-xs">
          JPG, PNG, WebP, AVIF or GIF up to 5 MB. First image is the cover.
        </p>
      </section>

      <section className="border-border bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Variants
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVariants((p) => [...p, emptyVariant()])}
          >
            Add variant
          </Button>
        </div>
        <div className="mt-4">
          <VariantAxesBuilder
            onGenerate={(rows) =>
              setVariants((prev) => [
                ...prev.filter((v) => v.id),
                ...rows,
              ])
            }
            basePrice={initial?.price?.toString() ?? ""}
          />
        </div>
        <input type="hidden" name="variants" value={JSON.stringify(variants)} />
        {state.fieldErrors?.variants && (
          <p className="text-destructive mt-2 text-xs">{state.fieldErrors.variants.en}</p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {variants.map((v, i) => (
            <div
              key={v.id ?? `new-${i}`}
              className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_100px_90px_36px]"
            >
              <div className="space-y-1">
                <Label htmlFor={`v-name-${i}`} className="text-xs">
                  Label
                </Label>
                <Input
                  id={`v-name-${i}`}
                  value={v.name}
                  onChange={(e) => updateVariant(i, { name: e.target.value })}
                  placeholder="e.g. Size M"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`v-sku-${i}`} className="text-xs">
                  SKU
                </Label>
                <Input
                  id={`v-sku-${i}`}
                  value={v.sku}
                  onChange={(e) => updateVariant(i, { sku: e.target.value })}
                  placeholder="e.g. SNG-S-M"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`v-price-${i}`} className="text-xs">
                  Price
                </Label>
                <Input
                  id={`v-price-${i}`}
                  value={v.price}
                  onChange={(e) => updateVariant(i, { price: e.target.value })}
                  type="number"
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`v-stock-${i}`} className="text-xs">
                  Stock
                </Label>
                <Input
                  id={`v-stock-${i}`}
                  value={v.stock}
                  onChange={(e) => updateVariant(i, { stock: e.target.value })}
                  type="number"
                  min={0}
                />
              </div>
              <div className="flex items-end pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVariants((p) => p.filter((_, idx) => idx !== i))}
                  aria-label="Remove variant"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          SEO
        </h2>
        <div className="mt-4">
          <SeoEditor
            siteName={siteName}
            urlSuffix={urlSuffix}
            defaultTitle={initial?.seoTitle ?? ""}
            defaultDescription={initial?.seoDescription ?? ""}
            fallbackDescription={
              initial?.shortDescription ?? initial?.description ?? ""
            }
            titlePlaceholder="Up to 60 characters"
            descriptionPlaceholder="Up to 160 characters"
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          <Save className="size-4" aria-hidden="true" />
          {productId ? "Save changes" : "Create product"}
        </Button>
        {state.ok && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Saved
          </p>
        )}
      </div>
    </form>
  );
}

type Axis = { name: string; values: string };

function VariantAxesBuilder({
  onGenerate,
  basePrice,
}: {
  onGenerate: (rows: VariantRow[]) => void;
  basePrice: string;
}) {
  const [axes, setAxes] = useState<Axis[]>([]);

  function setAxis(index: number, patch: Partial<Axis>) {
    setAxes((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  const valid = axes.every(
    (a) => a.name.trim().length > 0 && a.values.split(",").some((v) => v.trim())
  );

  function generate() {
    const parsed = axes.map((a) => ({
      name: a.name.trim(),
      values: a.values
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    }));
    const combos = parsed.reduce(
      (acc, axis) =>
        acc.flatMap((c) => axis.values.map((v) => ({ ...c, [axis.name]: v }))),
      [{} as Record<string, string>]
    );
    const rows = combos.map((attrs): VariantRow => {
      const label = Object.values(attrs).join(" / ");
      return {
        name: label,
        sku: Object.values(attrs)
          .join("-")
          .replace(/[^a-zA-Z0-9-]/g, "_"),
        price: basePrice,
        stock: "",
        attributes: attrs,
      };
    });
    onGenerate(rows);
  }

  return (
    <div className="border-border rounded-lg border p-3">
      <p className="mb-2 text-xs font-medium">
        Generate variants from option axes
        <span className="text-muted-foreground ml-1 font-normal">
          (e.g. Size with S, M, L + Color with Red, Blue)
        </span>
      </p>
      <div className="flex flex-col gap-2">
        {axes.map((axis, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[140px_1fr_32px]">
            <Input
              value={axis.name}
              onChange={(e) => setAxis(i, { name: e.target.value })}
              placeholder="Option name (e.g. Size)"
              className="h-8 text-xs"
            />
            <Input
              value={axis.values}
              onChange={(e) => setAxis(i, { values: e.target.value })}
              placeholder="Values, comma separated (e.g. S, M, L)"
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-1.5"
              onClick={() => setAxes((p) => p.filter((_, idx) => idx !== i))}
              aria-label="Remove option axis"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAxes((p) => [...p, { name: "", values: "" }])}
        >
          Add option axis
        </Button>
        <Button type="button" size="sm" onClick={generate} disabled={!valid}>
          Generate variants
        </Button>
      </div>
    </div>
  );
}
