import { Sparkles, Truck } from "lucide-react";
import type { LayoutSettings } from "@/lib/settings";

export function AnnouncementBar({ settings }: { settings: LayoutSettings }) {
  if (!settings.announceEnabled) return null;

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className="bg-emerald-950 text-emerald-50"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-6 px-4 py-1.5 text-xs sm:text-[0.8rem]">
        {settings.announceLeft && (
          <span className="hidden items-center gap-1.5 sm:flex">
            <Truck className="size-3.5" aria-hidden="true" />
            {settings.announceLeft}
          </span>
        )}
        {(settings.announcePre || settings.announceCode || settings.announcePost) && (
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {settings.announcePre && <span>{settings.announcePre}</span>}
            {settings.announceCode && <strong>{settings.announceCode}</strong>}
            {settings.announcePost && <span>{settings.announcePost}</span>}
          </span>
        )}
        {settings.announceRight && (
          <span className="hidden items-center gap-1.5 md:flex">
            <Truck className="size-3.5" aria-hidden="true" />
            {settings.announceRight}
          </span>
        )}
      </div>
    </div>
  );
}
