"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  convertIncompleteOrderAction,
  dismissIncompleteOrderAction,
  updateIncompleteOrderDetailsAction,
} from "@/actions/incomplete-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { deliveryFeeForZone } from "@/lib/delivery-fees";
import { zoneForAddress, type ZoneMatch } from "@/lib/delivery-zones";
import { formatPrice } from "@/lib/utils";

export function ConvertToOrderButton({
  id,
  disabled,
  disabledReason,
}: {
  id: string;
  disabled: boolean;
  disabledReason: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function convert() {
    setError(null);
    startTransition(async () => {
      const res = await convertIncompleteOrderAction(id);
      if (!res.ok) {
        setError(res.error ?? "Failed to create the order.");
        return;
      }
      toast.success(`Order ${res.orderNumber} created.`);
      router.push(`/admin/orders/${res.orderId}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" disabled={disabled || isPending} onClick={convert}>
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="size-3.5" aria-hidden="true" />
        )}
        Convert to order
      </Button>
      {disabled && !isPending ? (
        <p className="text-muted-foreground max-w-56 text-right text-xs">{disabledReason}</p>
      ) : null}
      {error ? <p className="max-w-56 text-right text-xs text-destructive">{error}</p> : null}
      {!disabled && !error ? (
        <p className="text-muted-foreground text-xs">Stock deducted on conversion</p>
      ) : null}
    </div>
  );
}

/**
 * Inline editor for the details a customer gives over the phone.
 *
 * A lead captured from just a name and phone cannot be converted, and a lead
 * captured before the customer picked a delivery zone carries no zone at all —
 * which silently bills an outside-Dhaka customer the Inside Dhaka rate. Staff
 * confirm and correct every field here, including the zone, and see the exact
 * delivery charge for each option before saving.
 */
export function IncompleteOrderDetailsEditor({
  id,
  initial,
  subtotal,
  discount,
  zones,
  baseFee,
  freeShippingThreshold,
  open,
}: {
  id: string;
  initial: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    address: string;
    deliveryZoneId: string;
  };
  subtotal: number;
  discount: number;
  zones: ZoneMatch[];
  baseFee: number;
  freeShippingThreshold: number;
  open: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(open);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The checkout preselects the first zone, so an abandoned checkout almost
  // always carries "Inside Dhaka" no matter where the customer actually is.
  // Flag the mismatch instead of silently charging the wrong rate.
  const detected = zoneForAddress(form.address, zones);
  // Mirror resolveDeliveryZone exactly: a blank zone means "work it out from the
  // address", so previewing the base fee there would show staff ৳60 and then
  // charge them ৳120 on save.
  const selected = form.deliveryZoneId
    ? (zones.find((zone) => zone.id === form.deliveryZoneId) ?? null)
    : detected;
  const fee = deliveryFeeForZone(selected, subtotal, {
    standardFee: baseFee,
    expressFee: 0,
    freeShippingThreshold,
  });
  const total = subtotal - discount + fee;
  const conflicts = Boolean(detected && form.deliveryZoneId && detected.id !== form.deliveryZoneId);
  const set = (patch: Partial<typeof initial>) => setForm((prev) => ({ ...prev, ...patch }));

  if (!expanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setForm(initial);
          setError(null);
          setExpanded(true);
        }}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Edit details
      </Button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateIncompleteOrderDetailsAction(id, {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        address: form.address,
        deliveryZoneId: form.deliveryZoneId,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to save the details.");
        return;
      }
      setExpanded(false);
      toast.success("Details saved.");
      router.refresh();
    });
  }

  const field = "text-sm";
  const label = "text-xs";

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border p-3 lg:max-w-lg">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`name-${id}`} className={label}>
            Customer name
          </Label>
          <Input
            id={`name-${id}`}
            value={form.customerName}
            onChange={(e) => set({ customerName: e.target.value })}
            className={field}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`phone-${id}`} className={label}>
            Mobile number
          </Label>
          <Input
            id={`phone-${id}`}
            inputMode="numeric"
            value={form.customerPhone}
            onChange={(e) => set({ customerPhone: e.target.value })}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor={`email-${id}`} className={label}>
            Email (optional)
          </Label>
          <Input
            id={`email-${id}`}
            type="email"
            value={form.customerEmail}
            onChange={(e) => set({ customerEmail: e.target.value })}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor={`address-${id}`} className={label}>
            Delivery address
          </Label>
          <Textarea
            id={`address-${id}`}
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="House, road, area, district — as the customer gave it"
            rows={2}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`zone-${id}`} className={label}>
            Delivery zone
          </Label>
          <select
            id={`zone-${id}`}
            value={form.deliveryZoneId}
            onChange={(e) => set({ deliveryZoneId: e.target.value })}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Auto-detect from address</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} — {formatPrice(zone.standardFee)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-1">
          <p className="text-muted-foreground text-xs">
            Delivery charge{" "}
            <span className="text-foreground font-semibold">{formatPrice(fee)}</span>
            {fee === 0 ? " (free)" : ""}
          </p>
          <p className="text-muted-foreground text-xs">
            Order total{" "}
            <span className="text-foreground font-semibold">{formatPrice(total)}</span>
          </p>
        </div>
      </div>

      {conflicts && detected ? (
        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          This address looks like <strong>{detected.name}</strong> (
          {formatPrice(detected.standardFee)}), but the lead is saved as{" "}
          <strong>{selected?.name}</strong> ({formatPrice(selected?.standardFee ?? baseFee)}).
          Confirm the zone with the customer.
        </p>
      ) : detected && !form.deliveryZoneId ? (
        <p className="text-muted-foreground text-xs">
          Auto-detected from the address: <strong>{detected.name}</strong> (
          {formatPrice(detected.standardFee)}).
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-3.5" aria-hidden="true" />
          )}
          Save details
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            setForm(initial);
            setError(null);
            setExpanded(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function DismissIncompleteOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await dismissIncompleteOrderAction(id);
          if (res.ok) {
            toast.success("Incomplete order dismissed.");
            router.refresh();
          } else {
            toast.error(res.error ?? "Failed to dismiss.");
          }
        });
      }}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <X className="size-3.5" aria-hidden="true" />
      )}
      Dismiss
    </Button>
  );
}
