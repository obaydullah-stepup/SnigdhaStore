"use client";

import { useActionState } from "react";
import { LoaderCircle, Settings2 } from "lucide-react";
import { setLowStockThresholdAction } from "@/actions/admin/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { ok: boolean; error?: string };
const initialState: Result = { ok: true };

export function LowStockThresholdForm({ threshold }: { threshold: number }) {
  const [state, action, pending] = useActionState(
    (_prev: Result, formData: FormData) => setLowStockThresholdAction(formData),
    initialState
  );

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="low-stock-threshold" className="text-xs">
          Low-stock alert at
        </Label>
        <div className="relative">
          <Settings2
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="low-stock-threshold"
            name="threshold"
            type="number"
            min={1}
            max={999}
            defaultValue={threshold}
            className="w-24 pl-9"
          />
        </div>
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? (
          <LoaderCircle className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <span className="mr-1.5">Save</span>
        )}
      </Button>
      {state.ok === false && state.error ? (
        <p className="text-destructive text-xs">{state.error}</p>
      ) : null}
    </form>
  );
}