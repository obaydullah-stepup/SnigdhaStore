import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { StorageProvider, StoredFile, UploadTicket } from "./types";
import { safeFolder, uniqueName } from "./extensions";

export class SupabaseStorageProvider implements StorageProvider {
  id = "supabase";

  private client() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase storage is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
      );
    }
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private bucket(): string {
    return process.env.SUPABASE_STORAGE_BUCKET ?? "snigdha";
  }

  private objectPath(folder: string, mime: string): string {
    return `${safeFolder(folder)}/${uniqueName(mime)}`;
  }

  private publicUrl(path: string): string {
    return this.client().storage.from(this.bucket()).getPublicUrl(path).data.publicUrl;
  }

  async putFile(options: {
    buffer: Buffer;
    filename: string;
    mime: string;
    folder?: string;
  }): Promise<StoredFile> {
    const { buffer, mime, folder = "products" } = options;
    const path = this.objectPath(folder, mime);
    const { data, error } = await this.client()
      .storage.from(this.bucket())
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (error) throw error;
    return { url: this.publicUrl(data.path), size: buffer.length };
  }

  async createUploadTicket(options: {
    filename: string;
    mime: string;
    folder?: string;
  }): Promise<UploadTicket> {
    const { mime, folder = "products" } = options;
    const path = this.objectPath(folder, mime);
    const { data, error } = await this.client()
      .storage.from(this.bucket())
      .createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("Could not create upload URL.");
    return {
      uploadUrl: data.signedUrl,
      publicUrl: this.publicUrl(path),
    };
  }

  async deleteFiles(urls: string[]): Promise<void> {
    const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${this.bucket()}/`;
    const paths = urls
      .filter((url) => url.startsWith(prefix))
      .map((url) => url.slice(prefix.length));
    if (paths.length === 0) return;
    const { error } = await this.client().storage.from(this.bucket()).remove(paths);
    if (error) throw error;
  }
}
