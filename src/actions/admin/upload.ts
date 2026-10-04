"use server";

import { requireStaff } from "@/lib/auth/guards";
import { storage } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES } from "@/lib/upload";
import type { LocalizedMessage } from "@/validators/auth";

export type ImageUploadResult = {
  ok: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  fieldErrors?: Record<string, LocalizedMessage>;
};

export async function createProductImageUploadAction(input: {
  filename: string;
  mime: string;
  folder?: string;
}): Promise<ImageUploadResult> {
  await requireStaff();

  if (!ALLOWED_IMAGE_TYPES.has(input.mime)) {
    return {
      ok: false,
      fieldErrors: {
        newImages: {
          en: `Unsupported file type: ${input.mime}. Use JPG, PNG, WebP, AVIF or GIF.`,
          bn: "অনুমোদিত নয় এমন ফাইল।",
        },
      },
    };
  }

  const ticket = await storage.createUploadTicket({
    filename: input.filename,
    mime: input.mime,
    folder: input.folder ?? "products",
  });

  return { ok: true, uploadUrl: ticket.uploadUrl, publicUrl: ticket.publicUrl };
}
