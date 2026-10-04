"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { upsertAddressAction } from "@/actions/addresses";
import { BANGLADESH_DIVISIONS } from "@/constants/bangladesh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddressForm({
  addressId,
  initial,
}: {
  addressId?: string;
  initial?: {
    name: string;
    phone: string;
    division: string;
    district: string;
    area: string;
    addressLine: string;
    postalCode?: string | null;
    isDefault: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(upsertAddressAction, {
    ok: false,
  });

  return (
    <form
      action={formAction}
      noValidate
      className="border-border bg-card grid gap-4 rounded-xl border p-5"
    >
      {addressId && <input type="hidden" name="addressId" value={addressId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initial?.name}
            placeholder="e.g. Rahim Uddin"
            aria-invalid={!!state.fieldErrors?.name}
          />
          {state.fieldErrors?.name && (
            <p className="text-destructive text-xs">{state.fieldErrors.name.en}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={initial?.phone}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={!!state.fieldErrors?.phone}
          />
          {state.fieldErrors?.phone && (
            <p className="text-destructive text-xs">{state.fieldErrors.phone.en}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="division">Division</Label>
          <Select name="division" defaultValue={initial?.division}>
            <SelectTrigger id="division" aria-invalid={!!state.fieldErrors?.division}>
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {BANGLADESH_DIVISIONS.map((d) => (
                <SelectItem key={d.name} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.division && (
            <p className="text-destructive text-xs">{state.fieldErrors.division.en}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="district">District</Label>
          <Input
            id="district"
            name="district"
            defaultValue={initial?.district}
            placeholder="e.g. Dhaka"
            aria-invalid={!!state.fieldErrors?.district}
          />
          {state.fieldErrors?.district && (
            <p className="text-destructive text-xs">{state.fieldErrors.district.en}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="area">Area / Upazila</Label>
          <Input
            id="area"
            name="area"
            defaultValue={initial?.area}
            placeholder="e.g. Dhanmondi"
            aria-invalid={!!state.fieldErrors?.area}
          />
          {state.fieldErrors?.area && (
            <p className="text-destructive text-xs">{state.fieldErrors.area.en}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={initial?.postalCode ?? ""}
            inputMode="numeric"
            placeholder="1209"
            aria-invalid={!!state.fieldErrors?.postalCode}
          />
          {state.fieldErrors?.postalCode && (
            <p className="text-destructive text-xs">{state.fieldErrors.postalCode.en}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="addressLine">Street address</Label>
        <Input
          id="addressLine"
          name="addressLine"
          defaultValue={initial?.addressLine}
          placeholder="House, road, block"
          aria-invalid={!!state.fieldErrors?.addressLine}
        />
        {state.fieldErrors?.addressLine && (
          <p className="text-destructive text-xs">{state.fieldErrors.addressLine.en}</p>
        )}
      </div>

      {(!initial || !initial.isDefault) && (
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isDefault"
            className="size-4"
            defaultChecked={initial?.isDefault}
          />
          Set as default address
        </label>
      )}

      {state.error && (
        <p className="text-destructive rounded-md bg-red-50 p-3 text-sm" role="alert">
          {state.error.en}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          <Save className="size-4" aria-hidden="true" />
          {addressId ? "Update address" : "Save address"}
        </Button>
      </div>
    </form>
  );
}
