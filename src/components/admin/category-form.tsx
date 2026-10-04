"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { saveCategoryAction } from "@/actions/admin/categories";
import { createProductImageUploadAction } from "@/actions/admin/upload";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryOption = { id: string; name: string; depth: number };

export function CategoryForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    parentId: string | null;
    sortOrder: number;
  };
}) {
  const [state, formAction, isPending] = useActionState(saveCategoryAction, {
    ok: false,
  });
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error(
        `Unsupported file type: ${file.type}. Use JPG, PNG, WebP, AVIF or GIF.`
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const ticket = await createProductImageUploadAction({
        filename: file.name,
        mime: file.type,
        folder: "categories",
      });
      if (!ticket.ok || !ticket.uploadUrl || !ticket.publicUrl) {
        toast.error(ticket.fieldErrors?.newImages?.en ?? "Upload failed.");
        return;
      }
      const res = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!res.ok) {
        toast.error("Upload failed. Please try again.");
        return;
      }
      setImage(ticket.publicUrl!);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state.error && (
        <p className="text-destructive rounded-md bg-red-50 p-3 text-sm" role="alert">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label>Category image</Label>
        <input type="hidden" name="image" value={image ?? ""} />
        {image ? (
          <div className="border-border relative aspect-[4/3] overflow-hidden rounded-lg border">
            <Image src={image} alt="" fill sizes="360px" className="object-cover" />
            <span className="absolute top-2 right-2 flex gap-1">
              <label className="bg-background/80 hover:bg-background flex cursor-pointer items-center gap-1 rounded p-1.5 text-xs font-medium">
                <ImagePlus className="size-3.5" aria-hidden="true" />
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  className="sr-only"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
              <button
                type="button"
                onClick={() => setImage(null)}
                className="bg-destructive text-destructive-foreground rounded p-1.5 text-xs font-medium"
                aria-label="Remove image"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          </div>
        ) : (
          <label className="border-border text-muted-foreground hover:bg-muted flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs">
            {uploading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-5" aria-hidden="true" />
            )}
            Upload image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="sr-only"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        )}
        <p className="text-muted-foreground text-xs">
          JPG, PNG, WebP, AVIF or GIF up to 5 MB.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={initial?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={initial?.slug}
            placeholder="auto from name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentId">Parent category</Label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={initial?.parentId ?? ""}
            className="border-border bg-card w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">None (top level)</option>
            {categories
              .filter((c) => c.id !== initial?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {`${"—".repeat(c.depth + 1)} ${c.name}`}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={initial?.sortOrder ?? 0}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="border-border bg-card w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {initial ? "Save changes" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
