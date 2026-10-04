"use client";

import { Globe } from "lucide-react";
import { useIntl } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { lang, setLang } = useIntl();

  return (
    <div className="border-input inline-flex items-center rounded-lg border">
      {(["en", "bn"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => void setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "text-foreground/70 hover:text-foreground rounded-md px-2 py-1 text-xs font-medium",
            lang === code && "bg-muted text-foreground"
          )}
        >
          {code === "en" ? "EN" : "বাং"}
        </button>
      ))}
      <Globe className="text-muted-foreground mx-1 size-3.5" aria-hidden="true" />
    </div>
  );
}