"use client";

import { useRouter } from "next/navigation";

export function FilterSelect({
  value,
  options,
  hrefs,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  hrefs: Record<string, string>;
  label?: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        const href = hrefs[e.target.value];
        if (href) router.push(href);
      }}
      className="border-border bg-card rounded-md border px-2 py-1.5 text-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
