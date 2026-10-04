"use client";

import { useActionState } from "react";
import { LoaderCircle, Lock, Mail, Phone, Sparkles, User } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/auth/form-message";
import type { AuthActionResult } from "@/validators/auth";

const initialState: AuthActionResult = { ok: false };

export function RegisterForm({ next }: { next?: string }) {
  const [state, dispatch, pending] = useActionState(registerAction, initialState);

  return (
    <form action={dispatch} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.ok === false && state.error ? <FormAlert message={state.error} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <div className="relative">
          <User
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Tasnim Ahmed"
            className="pl-9"
            required
          />
        </div>
        <FieldError message={state.ok === false ? state.fieldErrors?.name : undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="pl-9"
            required
          />
        </div>
        <FieldError message={state.ok === false ? state.fieldErrors?.email : undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <div className="relative">
          <Phone
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+8801XXXXXXXXX"
            className="pl-9"
          />
        </div>
        <FieldError message={state.ok === false ? state.fieldErrors?.phone : undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
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
          <Sparkles className="mr-2 size-4" aria-hidden="true" />
        )}
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
