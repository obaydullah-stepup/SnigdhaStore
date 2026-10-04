"use client";

import { useActionState } from "react";
import { LoaderCircle, Lock, RefreshCw } from "lucide-react";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/auth/form-message";
import type { AuthActionResult } from "@/validators/auth";

const initialState: AuthActionResult = { ok: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, dispatch, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      {state.ok === false && state.error ? <FormAlert message={state.error} /> : null}

      {state.ok === false && state.error ? (
        <p className="text-muted-foreground text-center text-xs">
          Request a new one{" "}
          <a href="/forgot-password" className="text-primary font-medium hover:underline">
            here
          </a>
          .
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Lock
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="pl-9"
            required
          />
        </div>
        <FieldError
          message={state.ok === false ? state.fieldErrors?.password : undefined}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="mr-2 size-4" aria-hidden="true" />
        )}
        {pending ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
