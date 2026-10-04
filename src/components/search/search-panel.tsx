"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Search, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useIntl } from "@/components/i18n/locale-provider";

const RECENT_KEY = "snigdha_recent_searches";

type Suggestion = {
  slug: string;
  name: string;
  price: number;
  categoryName: string | null;
  image: string | null;
};

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function writeRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function SearchPanel({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const { t } = useIntl();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [open, setOpen] = useState(false);
  const [recent] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readRecent()
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Suggestion[]) => {
          setSuggestions(data);
          setOpen(true);
        })
        .finally(() => setLoadingSuggestions(false));
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  function submit(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    writeRecent(trimmed);
    setOpen(false);
    setQuery(trimmed);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    });
  }

  return (
    <div>
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setQuery(value);
            if (value.trim()) {
              setLoadingSuggestions(true);
              setOpen(true);
            } else {
              setSuggestions([]);
              setLoadingSuggestions(false);
              setOpen(false);
            }
          }}
          onFocus={() => {
            setOpen(true);
            if (query.trim()) fetchSuggestionsOnFocus(query);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.inputAria")}
          className="h-11 pl-9"
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            aria-label={t("search.clearAria")}
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:bg-muted absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      {open && query.trim() && (
        <div className="relative z-20">
          <div className="border-border bg-popover text-popover-foreground absolute inset-x-0 top-2 overflow-hidden rounded-xl border shadow-lg">
            {loadingSuggestions ? (
              <p className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("search.searching")}
              </p>
            ) : suggestions.length === 0 ? (
              <button
                type="button"
                className="text-muted-foreground hover:bg-muted block w-full px-4 py-3 text-left text-sm"
                onMouseDown={() => submit(query)}
              >
                {t("search.noMatches", { q: query.trim() })}
              </button>
            ) : (
              <ul>
                {suggestions.map((s) => (
                  <li key={s.slug}>
                    <a
                      href={`/product/${s.slug}`}
                      onMouseDown={(e) => e.preventDefault()}
                      className="hover:bg-muted flex items-center gap-3 px-3 py-2.5"
                    >
                      <span className="bg-muted relative block size-10 shrink-0 overflow-hidden rounded-md">
                        {s.image && (
                          <Image
                            src={s.image}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 block text-sm font-medium">
                          {s.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {s.categoryName} · {formatPrice(s.price)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="border-border text-primary hover:bg-muted block w-full border-t px-4 py-2.5 text-left text-sm font-medium"
                    onMouseDown={() => submit(query)}
                  >
                    {t("search.viewAll", { q: query.trim() })}
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("search.recent")}
          </span>
          {recent.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => submit(term)}
              className="border-border bg-secondary/60 text-foreground hover:border-primary hover:text-primary rounded-full border px-3 py-1 text-sm transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {isPending && (
        <p className="sr-only" role="status">
          {t("search.searching")}
        </p>
      )}
    </div>
  );

  function fetchSuggestionsOnFocus(term: string) {
    fetch(`/api/search/suggest?q=${encodeURIComponent(term.trim())}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Suggestion[]) => setSuggestions(data))
      .catch(() => {
        /* ignore */
      });
  }
}
