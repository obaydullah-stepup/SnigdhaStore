import "server-only";
import { cookies } from "next/headers";
import {
  LANG_COOKIE,
  getDictionary,
  isLang,
  translate,
  type Lang,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";
import { getCachedStoreName } from "@/lib/settings";

export async function getLocale(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}

/**
 * `storeName` is injected into every translation as `{brand}`, so dictionary
 * copy can reference the store without each call site importing the name. It is
 * passed explicitly where the caller already has the settings loaded (header,
 * footer, storefront layout) to avoid a second lookup; otherwise it falls back
 * to the cached database value.
 */
export async function getTranslations(storeName?: string) {
  const [lang, brand] = await Promise.all([
    getLocale(),
    storeName ?? getCachedStoreName(),
  ]);
  const dict = getDictionary(lang);
  return {
    lang,
    brand,
    dict,
    t: (key: TranslationKey, vars?: Record<string, number | string>) =>
      translate(dict, key, { brand, ...vars }),
  };
}

export type Translator = Awaited<ReturnType<typeof getTranslations>>["t"];
