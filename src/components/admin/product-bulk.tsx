"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { bulkProductAction } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";

type BulkCtxValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  allIds: string[];
  allSelected: boolean;
};

const BulkCtx = createContext<BulkCtxValue | null>(null);

export function useBulk() {
  const ctx = useContext(BulkCtx);
  if (!ctx) throw new Error("useBulk must be used inside <BulkProvider>");
  return ctx;
}

export function BulkProvider({
  ids,
  children,
}: {
  ids: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const allIds = useMemo(() => ids, [ids]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function clear() {
    setSelected(new Set());
  }

  async function run(action: "publish" | "unpublish" | "delete") {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkProductAction({ ids, action });
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(
        action === "delete"
          ? `Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}.`
          : `${action === "publish" ? "Published" : "Unpublished"} ${ids.length} product${ids.length === 1 ? "" : "s"}.`
      );
      clear();
      router.refresh();
    });
  }

  return (
    <BulkCtx.Provider
      value={{ selected, toggle, toggleAll, clear, allIds, allSelected }}
    >
      {children}
      {selected.size > 0 && (
        <div className="border-border bg-card fixed right-4 bottom-4 left-4 z-40 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 shadow-lg">
          <p className="text-sm font-medium">
            {selected.size} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => run("publish")}
            >
              {isPending ? "Working…" : "Publish"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => run("unpublish")}
            >
              {isPending ? "Working…" : "Unpublish"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (window.confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) {
                  run("delete");
                }
              }}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
              )}
              Delete
            </Button>
          </div>
        </div>
      )}
    </BulkCtx.Provider>
  );
}

export function BulkRowCheckbox({ id }: { id: string }) {
  const { selected, toggle } = useBulk();
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      aria-label="Select product"
      className="size-3.5"
    />
  );
}

export function BulkHeaderCheckbox() {
  const { allSelected, toggleAll } = useBulk();
  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={toggleAll}
      aria-label="Select all products"
      className="size-3.5"
    />
  );
}