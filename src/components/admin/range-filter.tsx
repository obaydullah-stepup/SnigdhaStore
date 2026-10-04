"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RangeKey } from "@/lib/data/admin/overview";

const OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

export function RangeFilter({ current }: { current: RangeKey }) {
  return (
    <div className="border-border bg-card flex gap-1 rounded-lg border p-0.5">
      {OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={`/admin?range=${o.value}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
