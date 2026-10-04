import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getTranslations } from "@/lib/i18n";

export async function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  const { t } = await getTranslations();
  const trail = [{ label: t("breadcrumb.home"), href: "/" }, ...items];

  return (
    <nav
      aria-label={t("breadcrumb.aria")}
      className="flex flex-wrap items-center gap-1 text-sm"
    >
      {trail.map((item, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1">
            {i === 0 && (
              <Home className="text-muted-foreground size-3.5" aria-hidden="true" />
            )}
            {isLast || !item.href ? (
              <span className="text-muted-foreground line-clamp-1">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <ChevronRight
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}
