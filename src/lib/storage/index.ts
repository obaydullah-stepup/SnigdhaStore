export * from "./types";
export { LocalProvider } from "./local";
export { SupabaseStorageProvider } from "./supabase";
import type { StorageProvider } from "./types";
import { LocalProvider } from "./local";
import { SupabaseStorageProvider } from "./supabase";

export const storage: StorageProvider =
  process.env.STORAGE_PROVIDER === "supabase"
    ? new SupabaseStorageProvider()
    : new LocalProvider();
