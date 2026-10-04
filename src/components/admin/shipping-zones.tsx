"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteShippingZoneAction,
  saveShippingZoneAction,
  toggleShippingZoneActiveAction,
} from "@/actions/admin/shipping";
import { BANGLADESH_DIVISIONS } from "@/constants/bangladesh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ShippingZoneForm({
  zone,
}: {
  zone?: {
    id: string;
    name: string;
    description: string | null;
    divisions: string[];
    matchesAll: boolean;
    standardFee: number;
    expressFee: number;
    freeShippingThreshold: number | null;
    isActive: boolean;
    sortOrder: number;
  };
}) {
  const [state, action, pending] = useActionState(saveShippingZoneAction, { ok: false });
  const [selected, setSelected] = useState<string[]>(zone?.divisions ?? []);
  const [matchesAll, setMatchesAll] = useState(zone?.matchesAll ?? false);

  function toggleDivision(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  return (
    <form action={action} className="border-border bg-card rounded-xl border p-5">
      <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
        {zone ? "Edit shipping zone" : "Add shipping zone"}
      </h2>
      {zone?.id && <input type="hidden" name="id" value={zone.id} />}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="zone-name">Zone name</Label>
          <Input
            id="zone-name"
            name="name"
            required
            defaultValue={zone?.name ?? ""}
            placeholder="e.g. Inside Dhaka"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="zone-desc">Description (optional)</Label>
          <Textarea
            id="zone-desc"
            name="description"
            rows={2}
            defaultValue={zone?.description ?? ""}
            placeholder="e.g. Same-day delivery within greater Dhaka"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Divisions</Label>
          <div className="flex flex-wrap gap-1.5">
            {BANGLADESH_DIVISIONS.map((d) => (
              <label key={d.name} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  name="divisions"
                  value={d.name}
                  checked={selected.includes(d.name)}
                  onChange={() => toggleDivision(d.name)}
                  disabled={matchesAll}
                  className="size-3.5"
                />
                <span className="text-xs">{d.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="matchesAll"
              checked={matchesAll}
              onChange={() => setMatchesAll((v) => !v)}
              className="size-3.5"
            />
            All divisions (catch-all zone)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={zone?.isActive ?? true}
              className="size-3.5"
            />
            Active
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="std-fee">Standard fee</Label>
          <Input
            id="std-fee"
            name="standardFee"
            type="number"
            min={0}
            required
            defaultValue={zone?.standardFee ?? 60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-fee">Express fee</Label>
          <Input
            id="exp-fee"
            name="expressFee"
            type="number"
            min={0}
            required
            defaultValue={zone?.expressFee ?? 120}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="free-threshold">
            Free shipping threshold (leave empty to use global setting)
          </Label>
          <Input
            id="free-threshold"
            name="freeShippingThreshold"
            type="number"
            min={0}
            defaultValue={zone?.freeShippingThreshold ?? ""}
            placeholder="e.g. 3000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort-order">Sort order</Label>
          <Input
            id="sort-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={zone?.sortOrder ?? 0}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {zone ? "Save zone" : "Add zone"}
        </Button>
        {state.ok && (
          <span className="ml-3 text-sm text-emerald-700">Zone saved.</span>
        )}
        {state.error && <span className="text-destructive ml-3 text-sm">{state.error}</span>}
      </div>
    </form>
  );
}

export function ZoneRowActions({
  id,
  isActive,
  canDelete,
}: {
  id: string;
  isActive: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleShippingZoneActiveAction(id, !isActive);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Delete this shipping zone?")) return;
    startTransition(async () => {
      const result = await deleteShippingZoneAction(id);
      if (!result.ok) toast.error("Failed to delete zone.");
      router.refresh();
    });
  }

  return (
    <div className={cn("flex items-center gap-1", canDelete ? "" : "opacity-40")}>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-medium",
          isActive ? "text-emerald-700" : "text-muted-foreground"
        )}
      >
        {isActive ? "Active" : "Hidden"}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending || !canDelete}
        onClick={remove}
        aria-label="Delete zone"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}