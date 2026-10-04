"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { updateProfileAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string | null };
}) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, {
    ok: false,
  });

  return (
    <form
      action={formAction}
      noValidate
      className="border-border bg-card grid max-w-xl gap-4 rounded-xl border p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial.name}
          aria-invalid={!!state.fieldErrors?.name}
        />
        {state.fieldErrors?.name && (
          <p className="text-destructive text-xs">{state.fieldErrors.name.en}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={initial.email} disabled />
        <p className="text-muted-foreground text-xs">Email can&apos;t be changed.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          inputMode="tel"
          defaultValue={initial.phone ?? ""}
          placeholder="01XXXXXXXXX"
          aria-invalid={!!state.fieldErrors?.phone}
        />
        {state.fieldErrors?.phone && (
          <p className="text-destructive text-xs">{state.fieldErrors.phone.en}</p>
        )}
      </div>

      {state.error && (
        <p className="text-destructive rounded-md bg-red-50 p-3 text-sm" role="alert">
          {state.error.en}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          <Save className="size-4" aria-hidden="true" />
          Save changes
        </Button>
        {state.ok && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {state.message?.en ?? "Saved."}
          </p>
        )}
      </div>
    </form>
  );
}
