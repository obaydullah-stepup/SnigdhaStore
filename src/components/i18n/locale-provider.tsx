"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LANG_COOKIE,
  getDictionary,
  translate,
  type Lang,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";
import { setLocaleAction } from "@/actions/i18n";

type LocaleContextValue = {
  lang: Lang;
  brand: string;
  t: (key: TranslationKey, vars?: Record<string, number | string>) => string;
  setLang: (lang: Lang) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLang,
  storeName,
  children,
}: {
  initialLang: Lang;
  storeName: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  async function setLang(next: Lang) {
    setLangState(next);
    const result = await setLocaleAction(next);
    if (result.ok) router.refresh();
  }

  const dict = getDictionary(lang);
  const value: LocaleContextValue = {
    lang,
    brand: storeName,
    t: (key, vars) => translate(dict, key, { brand: storeName, ...vars }),
    setLang,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useIntl(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const dict = getDictionary("en");
    return {
      lang: "en",
      brand: "",
      t: (key, vars) => translate(dict, key, { brand: "", ...vars }),
      setLang: async () => {},
    };
  }
  return ctx;
}

export { LANG_COOKIE };
