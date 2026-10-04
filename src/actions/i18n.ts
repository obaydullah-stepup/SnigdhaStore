"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/i18n/dictionaries";

export async function setLocaleAction(lang: string): Promise<{ ok: boolean }> {
  if (!isLang(lang)) return { ok: false };
  const store = await cookies();
  store.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true };
}

export type { Lang };