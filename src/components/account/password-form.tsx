"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { changePasswordAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, {
    ok: false,
  });

  return (
    <form
      action={formAction}
      noValidate
      className="border-border bg-card grid max-w-xl gap-4 rounded-xl border p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!state.fieldErrors?.currentPassword}
        />
        {state.fieldErrors?.currentPassword && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.currentPassword.en}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!state.fieldErrors?.newPassword}
        />
        {state.fieldErrors?.newPassword && (
          <p className="text-destructive text-xs">{state.fieldErrors.newPassword.en}</p>
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
          <KeyRound className="size-4" aria-hidden="true" />
          Change password
        </Button>
        {state.ok && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {state.message?.en ?? "Password changed."}
          </p>
        )}
      </div>
    </form>
  );
}
