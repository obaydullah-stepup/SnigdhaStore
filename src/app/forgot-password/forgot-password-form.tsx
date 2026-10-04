"use client";

import { useActionState } from "react";
import { LoaderCircle, Mail, Send } from "lucide-react";
import { requestPasswordResetAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/auth/form-message";
import type { AuthActionResult } from "@/validators/auth";

const initialState: AuthActionResult = { ok: false };

export function ForgotPasswordForm() {
  const [state, dispatch, pending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  if (state.ok) {
    return (
      <FormAlert
        tone="success"
        message={{
          en: "If an account exists for that email, we've sent a password reset link.",
          bn: "যদি সেই ইমেইলে একটি অ্যাকাউন্ট থাকে, তাহলে আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠিয়েছি।",
        }}
      />
    );
  }

  return (
    <form action={dispatch} className="space-y-4" noValidate>
      {state.ok === false && state.error ? <FormAlert message={state.error} /> : null}

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

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
        variant={pending ? "secondary" : "default"}
      >
        {pending ? (
          <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="mr-2 size-4" aria-hidden="true" />
        )}
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Already used a link? Request a fresh one here.
      </p>
    </form>
  );
}
